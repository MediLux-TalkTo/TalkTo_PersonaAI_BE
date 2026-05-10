import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { hashValue } from '../common/utils/password.util';
import { Persona } from '../personas/persona.entity';
import { User } from '../users/user.entity';

@Injectable()
export class BootstrapService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Persona)
    private readonly personasRepository: Repository<Persona>,
  ) {}

  async onApplicationBootstrap() {
    await this.ensureAdminUser();
    await this.ensureDefaultPersona();
  }

  private async ensureAdminUser() {
    const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@talkto.local';
    const existingAdmin = await this.usersRepository.findOne({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      return;
    }

    const admin = this.usersRepository.create({
      name: process.env.ADMIN_NAME ?? 'Local Admin',
      email: adminEmail,
      phoneNumber: null,
      passwordHash: await hashValue(process.env.ADMIN_PASSWORD ?? 'Admin1234!'),
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    });

    await this.usersRepository.save(admin);
  }

  private async ensureDefaultPersona() {
    const activePersona = await this.personasRepository.findOne({
      where: { isActive: true },
    });

    if (activePersona) {
      return;
    }

    const persona = this.personasRepository.create({
      displayName: '우리 할머니',
      description: '따뜻하고 안정적으로 응답하는 기본 페르소나',
      profileImageUrl: null,
      voiceId: 'default-voice',
      modelId: 'default-model',
      isActive: true,
    });

    await this.personasRepository.save(persona);
  }
}
