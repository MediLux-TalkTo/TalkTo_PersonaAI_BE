import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { AnalysisModule } from './analysis/analysis.module';
import { AuditModule } from './audit/audit.module';
import { BootstrapService } from './bootstrap/bootstrap.service';
import { ConsentsModule } from './consents/consents.module';
import { ConversationsModule } from './conversations/conversations.module';
import { DataRightsModule } from './data-rights/data-rights.module';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import { PersonasModule } from './personas/personas.module';
import { PersonaRuntimeModule } from './persona-runtime/persona-runtime.module';
import { UsersModule } from './users/users.module';
import { VoicePersonaModule } from './voice-persona/voice-persona.module';
import { MemoriesModule } from './memories/memories.module';
import { MemoriesSearchModule } from './memories-search/memories-search.module';
import { MemorySegmentsModule } from './memory-segments/memory-segments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { FeedbackModule } from './feedback/feedback.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { QuestionsModule } from './questions/questions.module';
import { RecordingsModule } from './recordings/recordings.module';
import { ProductsModule } from './products/products.module';
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
    AnalysisModule,
    AuditModule,
    ConsentsModule,
    ConversationsModule,
    DataRightsModule,
    EventsModule,
    FeedbackModule,
    HealthModule,
    MemorySegmentsModule,
    MemoriesSearchModule,
    MemoriesModule,
    NotificationsModule,
    OnboardingModule,
    OrdersModule,
    PaymentsModule,
    PersonasModule,
    PersonaRuntimeModule,
    ProductsModule,
    QuestionsModule,
    RecordingsModule,
    SubjectsModule,
    UsersModule,
    VoicePersonaModule,
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
