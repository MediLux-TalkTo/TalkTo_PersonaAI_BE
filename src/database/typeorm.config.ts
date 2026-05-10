import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function buildTypeOrmOptions(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_NAME ?? 'talkto_persona_ai',
    autoLoadEntities: true,
    synchronize: (process.env.DB_SYNCHRONIZE ?? 'true') === 'true',
    retryAttempts: 3,
    retryDelay: 1000,
  };
}
