import { join } from 'path';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';

export function buildDataSourceOptions(): DataSourceOptions & {
  type: 'postgres';
  ssl: boolean;
} {
  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_NAME ?? 'talkto_persona_ai',
    ssl: isDbSslEnabled(),
    entities: [join(process.cwd(), 'src', '**', '*.entity.ts')],
    migrations: [join(process.cwd(), 'src', 'database', 'migrations', '*.ts')],
    migrationsRun: (process.env.DB_MIGRATIONS_RUN ?? 'false') === 'true',
    synchronize: (process.env.DB_SYNCHRONIZE ?? 'true') === 'true',
  };
}

export function buildTypeOrmOptions(): TypeOrmModuleOptions & { ssl: boolean } {
  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_NAME ?? 'talkto_persona_ai',
    ssl: isDbSslEnabled(),
    autoLoadEntities: true,
    synchronize: (process.env.DB_SYNCHRONIZE ?? 'true') === 'true',
    migrationsRun: (process.env.DB_MIGRATIONS_RUN ?? 'false') === 'true',
    retryAttempts: 3,
    retryDelay: 1000,
  };
}

function isDbSslEnabled(): boolean {
  return (process.env.DB_SSL ?? 'false') === 'true';
}
