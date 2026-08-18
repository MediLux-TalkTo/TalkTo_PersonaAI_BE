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
   * 채팅 생성 전용 — select:false인 systemPrompt까지 명시적으로 불러온다.
   * API 응답 경로(getActivePersona)는 systemPrompt를 노출하지 않는다.
   */
  async getActivePersonaForChat(): Promise<Persona> {
    const persona = await this.personasRepository
      .createQueryBuilder('persona')
      .addSelect('persona.systemPrompt')
      .where('persona.isActive = :active', { active: true })
      .orderBy('persona.createdAt', 'ASC')
      .getOne();

    return persona ?? (await this.getActivePersona());
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
