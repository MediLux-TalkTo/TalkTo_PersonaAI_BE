import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../conversations/message.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { Feedback } from './feedback.entity';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
  ) {}

  async create(messageId: string, userId: string, dto: CreateFeedbackDto) {
    const message = await this.messagesRepository.findOne({ where: { id: messageId } });

    if (!message) {
      throw new NotFoundException('Message not found.');
    }

    let feedback = await this.feedbackRepository.findOne({
      where: { messageId, userId },
    });

    if (!feedback) {
      feedback = this.feedbackRepository.create({
        messageId,
        userId,
        rating: dto.rating,
        tags: dto.tags ?? [],
        comment: dto.comment ?? null,
      });
    } else {
      feedback.rating = dto.rating;
      feedback.tags = dto.tags ?? [];
      feedback.comment = dto.comment ?? null;
    }

    return this.feedbackRepository.save(feedback);
  }

  async list() {
    return this.feedbackRepository.find({
      relations: ['message', 'user'],
      order: { createdAt: 'DESC' },
    });
  }
}
