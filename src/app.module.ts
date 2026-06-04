import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { BootstrapService } from './bootstrap/bootstrap.service';
import { ConsentsModule } from './consents/consents.module';
import { ConversationsModule } from './conversations/conversations.module';
import { HealthModule } from './health/health.module';
import { PersonasModule } from './personas/personas.module';
import { UsersModule } from './users/users.module';
import { MemoriesModule } from './memories/memories.module';
import { FeedbackModule } from './feedback/feedback.module';
import { QuestionsModule } from './questions/questions.module';
import { RecordingsModule } from './recordings/recordings.module';
import { SubjectsModule } from './subjects/subjects.module';
import { buildTypeOrmOptions } from './database/typeorm.config';
import { validateEnv } from './config/env.validation';
import { User } from './users/user.entity';
import { Persona } from './personas/persona.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL ?? 60000),
        limit: Number(process.env.THROTTLE_LIMIT ?? 60),
      },
    ]),
    TypeOrmModule.forRootAsync({
      useFactory: buildTypeOrmOptions,
    }),
    TypeOrmModule.forFeature([User, Persona]),
    AuthModule,
    AdminModule,
    ConsentsModule,
    ConversationsModule,
    FeedbackModule,
    HealthModule,
    MemoriesModule,
    PersonasModule,
    QuestionsModule,
    RecordingsModule,
    SubjectsModule,
    UsersModule,
  ],
  providers: [
    BootstrapService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
