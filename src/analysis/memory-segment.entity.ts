import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AnalysisJob } from './analysis-job.entity';

@Entity('memory_segments')
@Index('IDX_memory_segments_job_index', ['jobId', 'segmentIndex'], {
  unique: true,
})
@Index('IDX_memory_segments_recording', ['recordingId'])
export class MemorySegment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  jobId: string;

  @ManyToOne(() => AnalysisJob, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job?: AnalysisJob;

  @Column({ type: 'uuid' })
  ownerUserId: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'uuid' })
  recordingId: string;

  @Column({ type: 'integer' })
  segmentIndex: number;

  @Column({ type: 'text', array: true, default: '{}' })
  sourceTranscriptSegmentIds: string[];

  @Column({ type: 'integer' })
  startMs: number;

  @Column({ type: 'integer' })
  endMs: number;

  @Column({ type: 'varchar', length: 120, default: 'unknown' })
  speakerLabel: string;

  @Column({ type: 'text' })
  memoryText: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
