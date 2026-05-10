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
