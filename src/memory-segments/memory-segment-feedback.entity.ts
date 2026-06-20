import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { MemorySegment } from '../analysis/memory-segment.entity';
import { FeedbackRating } from '../common/enums/feedback.enum';
import { User } from '../users/user.entity';

@Entity('memory_segment_feedbacks')
@Unique(['memorySegmentId', 'userId'])
export class MemorySegmentFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  memorySegmentId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: FeedbackRating,
    enumName: 'feedbacks_rating_enum',
  })
  rating: FeedbackRating;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'integer', nullable: true })
  reportedStartMs: number | null;

  @Column({ type: 'integer', nullable: true })
  reportedEndMs: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => MemorySegment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memorySegmentId' })
  memorySegment: MemorySegment;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
