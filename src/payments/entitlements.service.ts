import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntitlementStatus } from './payment-event.constants';
import { Entitlement } from './entitlement.entity';

@Injectable()
export class EntitlementsService {
  constructor(
    @InjectRepository(Entitlement)
    private readonly entitlementsRepository: Repository<Entitlement>,
  ) {}

  async listActiveForUser(ownerUserId: string): Promise<Entitlement[]> {
    return this.entitlementsRepository.find({
      where: {
        ownerUserId,
        status: EntitlementStatus.ACTIVE,
      },
      order: { createdAt: 'DESC' },
    });
  }
}
