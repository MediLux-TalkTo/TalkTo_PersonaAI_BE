import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Memory } from './memory.entity';

@Entity('memory_embeddings')
export class MemoryEmbedding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  memoryId: string;

  @Column({ type: 'integer' })
  chunkIndex: number;

  @Column({ type: 'text' })
  chunkText: string;

  @Column({ type: 'float8', array: true, nullable: true })
  embedding: number[] | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Memory, (memory) => memory.embeddings, { onDelete: 'CASCADE' })
  memory: Memory;
}
