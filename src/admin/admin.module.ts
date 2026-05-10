import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '../conversations/conversation.entity';
import { Message } from '../conversations/message.entity';
import { VoiceArtifact } from '../conversations/voice-artifact.entity';
import { Feedback } from '../feedback/feedback.entity';
import { User } from '../users/user.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SystemLog } from './system-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SystemLog,
      User,
      Conversation,
      Message,
      VoiceArtifact,
      Feedback,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
