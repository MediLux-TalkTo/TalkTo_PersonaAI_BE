import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateConsentDto } from './dto/create-consent.dto';
import { Consent } from './consent.entity';

@Injectable()
export class ConsentsService {
  constructor(
    @InjectRepository(Consent)
    private readonly consentsRepository: Repository<Consent>,
  ) {}

  async getLatest(userId: string): Promise<Consent | null> {
    return this.consentsRepository.findOne({
      where: { userId },
      order: {
        acceptedAt: 'DESC',
      },
    });
  }

  async save(userId: string, dto: CreateConsentDto): Promise<Consent> {
    const consent = this.consentsRepository.create({
      userId,
      ...dto,
    });

    return this.consentsRepository.save(consent);
  }
}
