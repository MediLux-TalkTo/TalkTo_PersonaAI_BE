import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AnalysisJob } from './analysis-job.entity';
import { MemorySegment } from './memory-segment.entity';

@Entity('embeddings')
@Index('IDX_embeddings_job_index', ['jobId', 'embeddingIndex'], { unique: true })
@Index('IDX_embeddings_memory_segment', ['memorySegmentId'])
export class AnalysisEmbedding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  jobId: string;

  @ManyToOne(() => AnalysisJob, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job?: AnalysisJob;

  @Column({ type: 'uuid' })
  memorySegmentId: string;

  @ManyToOne(() => MemorySegment, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memorySegmentId' })
  memorySegment?: MemorySegment;

  @Column({ type: 'uuid' })
  ownerUserId: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'uuid' })
  recordingId: string;

  @Column({ type: 'integer' })
  embeddingIndex: number;

  @Column({ type: 'varchar', length: 80 })
  provider: string;

  @Column({ type: 'varchar', length: 120 })
  model: string;

  @Column({ type: 'integer' })
  dimensions: number;

  @Column({ type: 'float8', array: true })
  embedding: number[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
