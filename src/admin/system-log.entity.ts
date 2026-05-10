import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  SystemLogCategory,
  SystemLogSeverity,
} from '../common/enums/log.enum';

@Entity('system_logs')
export class SystemLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SystemLogCategory,
  })
  category: SystemLogCategory;

  @Column({
    type: 'enum',
    enum: SystemLogSeverity,
    default: SystemLogSeverity.INFO,
  })
  severity: SystemLogSeverity;

  @Column({ nullable: true })
  conversationId: string | null;

  @Column({ nullable: true })
  messageId: string | null;

  @Column({ type: 'jsonb', default: {} })
  detail: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  occurredAt: Date;
}
