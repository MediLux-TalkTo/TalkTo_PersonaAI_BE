import { join } from 'path';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';

export function buildDataSourceOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_NAME ?? 'talkto_persona_ai',
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    migrationsRun: (process.env.DB_MIGRATIONS_RUN ?? 'false') === 'true',
    synchronize: (process.env.DB_SYNCHRONIZE ?? 'true') === 'true',
  };
}

export function buildTypeOrmOptions(): TypeOrmModuleOptions {
  return {
    ...buildDataSourceOptions(),
    autoLoadEntities: true,
    retryAttempts: 3,
    retryDelay: 1000,
  };
}
