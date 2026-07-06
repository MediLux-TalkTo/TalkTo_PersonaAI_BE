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

@Entity('transcript_segments')
@Index('IDX_transcript_segments_job_index', ['jobId', 'segmentIndex'], {
  unique: true,
})
@Index('IDX_transcript_segments_recording', ['recordingId'])
export class TranscriptSegment {
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

  @Column({ type: 'integer' })
  startMs: number;

  @Column({ type: 'integer' })
  endMs: number;

  @Column({ type: 'varchar', length: 120, default: 'unknown' })
  speakerLabel: string;

  @Column({ type: 'text' })
  transcriptText: string;

  @Column({ type: 'double precision', nullable: true })
  confidence: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
