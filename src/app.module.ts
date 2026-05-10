import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { BootstrapService } from './bootstrap/bootstrap.service';
import { ConsentsModule } from './consents/consents.module';
import { ConversationsModule } from './conversations/conversations.module';
import { PersonasModule } from './personas/personas.module';
import { UsersModule } from './users/users.module';
import { MemoriesModule } from './memories/memories.module';
import { FeedbackModule } from './feedback/feedback.module';
import { buildTypeOrmOptions } from './database/typeorm.config';
import { User } from './users/user.entity';
import { Persona } from './personas/persona.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: buildTypeOrmOptions,
    }),
    TypeOrmModule.forFeature([User, Persona]),
    AuthModule,
    AdminModule,
    ConsentsModule,
    ConversationsModule,
    FeedbackModule,
    MemoriesModule,
    PersonasModule,
    UsersModule,
  ],
  providers: [BootstrapService],
})
export class AppModule {}
