import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from '../conversations/message.entity';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { Feedback } from './feedback.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Feedback, Message])],
  controllers: [FeedbackController],
  providers: [FeedbackService],
})
export class FeedbackModule {}
