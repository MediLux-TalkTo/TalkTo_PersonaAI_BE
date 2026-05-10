import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { hashValue } from '../common/utils/password.util';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findById(userId: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }

  async findByIdentifier(identifier: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: [{ email: identifier }, { phoneNumber: identifier }],
    });
  }

  async list(): Promise<User[]> {
    return this.usersRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async invite(dto: InviteUserDto): Promise<{ user: User; temporaryPassword?: string }> {
    if (!dto.email && !dto.phoneNumber) {
      throw new BadRequestException('email or phoneNumber is required.');
    }

    const existing = await this.usersRepository.findOne({
      where: [
        ...(dto.email ? [{ email: dto.email }] : []),
        ...(dto.phoneNumber ? [{ phoneNumber: dto.phoneNumber }] : []),
      ],
    });

    if (existing) {
      throw new BadRequestException('User already exists.');
    }

    const temporaryPassword =
      dto.password ?? Math.random().toString(36).slice(-12) + 'A1!';

    const user = this.usersRepository.create({
      name: dto.name,
      email: dto.email ?? null,
      phoneNumber: dto.phoneNumber ?? null,
      passwordHash: await hashValue(temporaryPassword),
      role: dto.role ?? Role.FAMILY,
      status: UserStatus.INVITED,
    });

    const savedUser = await this.usersRepository.save(user);

    return {
      user: savedUser,
      temporaryPassword: dto.password ? undefined : temporaryPassword,
    };
  }

  async update(userId: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(userId);

    Object.assign(user, dto);

    if (dto.status === UserStatus.ACTIVE && user.status === UserStatus.INVITED) {
      user.status = UserStatus.ACTIVE;
    }

    return this.usersRepository.save(user);
  }

  async updateRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.usersRepository.update(userId, { refreshTokenHash });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      lastLoginAt: new Date(),
      status: UserStatus.ACTIVE,
    });
  }
}
