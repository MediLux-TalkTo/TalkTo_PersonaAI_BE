import {
  Column,
  Index,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MemoryStatus } from '../common/enums/memory.enums';
import { MessageMemoryRef } from '../conversations/message-memory-ref.entity';
import { MemoryEmbedding } from './memory-embedding.entity';
import { MemoryRevision } from './memory-revision.entity';

@Entity('memories')
export class Memory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 대상자별로 기억을 가른다. 없으면 다른 대상자 기억이 검색에 섞인다.
  @Index()
  @Column({ type: 'uuid', nullable: true })
  subjectId: string | null;

  @Column({ length: 120 })
  title: string;

  @Column({ length: 50 })
  memoryType: string;

  @Column({ type: 'text', array: true, default: '{}' })
  relatedPeople: string[];

  @Column({ type: 'varchar', nullable: true })
  relatedPeriod: string | null;

  @Column({ type: 'text' })
  bodyMarkdown: string;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'float', default: 0.5 })
  confidenceScore: number;

  @Column({
    type: 'enum',
    enum: MemoryStatus,
    default: MemoryStatus.ACTIVE,
  })
  status: MemoryStatus;

  @Column({ type: 'varchar', nullable: true })
  createdBy: string | null;

  @Column({ type: 'varchar', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => MemoryRevision, (revision) => revision.memory)
  revisions: MemoryRevision[];

  @OneToMany(() => MemoryEmbedding, (embedding) => embedding.memory)
  embeddings: MemoryEmbedding[];

  @OneToMany(() => MessageMemoryRef, (ref) => ref.memory)
  messageMemoryRefs: MessageMemoryRef[];
}
