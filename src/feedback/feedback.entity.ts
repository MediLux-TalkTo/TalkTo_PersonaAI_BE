import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { FeedbackRating } from '../common/enums/feedback.enum';
import { Message } from '../conversations/message.entity';
import { User } from '../users/user.entity';

@Entity('feedbacks')
@Unique(['messageId', 'userId'])
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  messageId: string;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: FeedbackRating,
  })
  rating: FeedbackRating;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Message, (message) => message.feedbacks, { onDelete: 'CASCADE' })
  message: Message;

  @ManyToOne(() => User, (user) => user.feedbacks, { onDelete: 'CASCADE' })
  user: User;
}
