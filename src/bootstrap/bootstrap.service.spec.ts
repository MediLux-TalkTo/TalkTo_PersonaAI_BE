import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { BootstrapService } from './bootstrap.service';

describe('BootstrapService', () => {
  const usersRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  } as unknown as Repository<any>;

  const personasRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  } as unknown as Repository<any>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips bootstrap seed when BOOTSTRAP_SEED is false', async () => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'BOOTSTRAP_SEED') {
          return false;
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    const service = new BootstrapService(
      configService,
      usersRepository,
      personasRepository,
    );

    await service.onApplicationBootstrap();

    expect(usersRepository.findOne).not.toHaveBeenCalled();
    expect(personasRepository.findOne).not.toHaveBeenCalled();
  });
});
