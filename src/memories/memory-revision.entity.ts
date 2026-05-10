import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MemoryRevisionAction } from '../common/enums/memory.enums';
import { User } from '../users/user.entity';
import { Memory } from './memory.entity';

@Entity('memory_revisions')
export class MemoryRevision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  memoryId: string;

  @Column({
    type: 'enum',
    enum: MemoryRevisionAction,
  })
  action: MemoryRevisionAction;

  @Column({ type: 'jsonb', nullable: true })
  beforeSnapshot: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  afterSnapshot: Record<string, unknown> | null;

  @Column({ nullable: true })
  actorUserId: string | null;

  @Column({ nullable: true })
  reason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Memory, (memory) => memory.revisions, { onDelete: 'CASCADE' })
  memory: Memory;

  @ManyToOne(() => User, (user) => user.memoryRevisions, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  actorUser: User | null;
}
