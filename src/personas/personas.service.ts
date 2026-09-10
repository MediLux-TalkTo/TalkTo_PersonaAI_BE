import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdatePersonaDto } from './dto/update-persona.dto';
import { Persona } from './persona.entity';

@Injectable()
export class PersonasService {
  constructor(
    @InjectRepository(Persona)
    private readonly personasRepository: Repository<Persona>,
  ) {}

  async getActivePersona(): Promise<Persona> {
    let persona = await this.personasRepository.findOne({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });

    if (!persona) {
      persona = this.personasRepository.create({
        displayName: '우리 할머니',
        description: '따뜻하고 안정적으로 응답하는 기본 페르소나',
        profileImageUrl: null,
        voiceId: 'default-voice',
        modelId: 'default-model',
        isActive: true,
      });
      persona = await this.personasRepository.save(persona);
    }

    return persona;
  }

  /**
   * 대화가 물고 있는 페르소나를 systemPrompt까지 붙여 가져온다.
   *
   * 대상자가 신금자 하나뿐일 때는 활성 페르소나 하나를 집어 쓰는 것으로 충분했지만,
   * 페르소나가 둘 이상이면 대화를 어떤 페르소나로 만들었는지가 무시된다.
   * 못 찾으면 예전처럼 활성 페르소나로 떨어진다.
   */
  async getPersonaForChat(personaId: string | null): Promise<Persona> {
    if (personaId) {
      try {
        const persona = await this.personasRepository
          .createQueryBuilder('persona')
          .addSelect('persona.systemPrompt')
          .where('persona.id = :personaId', { personaId })
          .andWhere('persona.isActive = :active', { active: true })
          .getOne();

        if (persona) {
          return persona;
        }
      } catch {
        // systemPrompt 컬럼 부재 등으로 실패 시 아래 활성 페르소나로 폴백
      }
    }
    return this.getActivePersonaForChat();
  }

  /**
   * 채팅 생성 전용 — select:false인 systemPrompt까지 명시적으로 불러온다.
   * API 응답 경로(getActivePersona)는 systemPrompt를 노출하지 않는다.
   */
  async getActivePersonaForChat(): Promise<Persona> {
    // systemPrompt 컬럼이 아직 없는 환경에서도 안전하게 동작하도록 방어한다.
    // 컬럼이 있으면 systemPrompt까지 불러오고, 없어 쿼리가 실패하면 기존 경로로 폴백.
    try {
      const persona = await this.personasRepository
        .createQueryBuilder('persona')
        .addSelect('persona.systemPrompt')
        .where('persona.isActive = :active', { active: true })
        .orderBy('persona.createdAt', 'ASC')
        .getOne();

      if (persona) {
        return persona;
      }
    } catch {
      // systemPrompt 컬럼 부재 등으로 실패 시 아래 기본 경로로 폴백
    }

    return this.getActivePersona();
  }

  async updatePersona(personaId: string, dto: UpdatePersonaDto): Promise<Persona> {
    const persona = await this.personasRepository.findOne({
      where: { id: personaId },
    });

    if (!persona) {
      throw new NotFoundException('Persona not found.');
    }

    if (dto.isActive) {
      await this.personasRepository.update({ isActive: true }, { isActive: false });
    }

    Object.assign(persona, dto);
    return this.personasRepository.save(persona);
  }
}
