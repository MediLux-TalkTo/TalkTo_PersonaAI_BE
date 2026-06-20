import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotificationType } from './notification.constants';

@Entity('notifications')
@Index('IDX_notifications_user_createdAt', ['userId', 'createdAt'])
@Index('IDX_notifications_user_readAt', ['userId', 'readAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 80 })
  type: NotificationType;

  @Column({ type: 'varchar', length: 160 })
  title: string;

  @Column({ type: 'varchar', length: 300 })
  body: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  resourceType: string | null;

  @Column({ type: 'uuid', nullable: true })
  resourceId: string | null;

  @Column({ type: 'uuid', nullable: true })
  subjectId: string | null;

  @Column({ type: 'uuid', nullable: true })
  recordingId: string | null;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, unknown>;

  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
