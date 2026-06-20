import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AnalysisJob } from '../analysis/analysis-job.entity';
import { Recording } from '../recordings/recording.entity';
import { Subject } from '../subjects/subject.entity';
import { MaskingSpan } from './masking-span.entity';
import { type MaskingStatus, type RedactionSourceType } from './masking.constants';

@Entity('transcript_redactions')
@Index('IDX_transcript_redactions_owner_source', [
  'ownerUserId',
  'sourceType',
  'sourceId',
])
@Index('IDX_transcript_redactions_recording_status', ['recordingId', 'status'])
export class TranscriptRedaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ownerUserId: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @ManyToOne(() => Subject, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subjectId' })
  subject?: Subject;

  @Column({ type: 'uuid', nullable: true })
  recordingId: string | null;

  @ManyToOne(() => Recording, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recordingId' })
  recording?: Recording | null;

  @Column({ type: 'uuid', nullable: true })
  analysisJobId: string | null;

  @ManyToOne(() => AnalysisJob, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'analysisJobId' })
  analysisJob?: AnalysisJob | null;

  @Column({ type: 'varchar', length: 40 })
  sourceType: RedactionSourceType;

  @Column({ type: 'uuid' })
  sourceId: string;

  @Column({ type: 'varchar', length: 40 })
  status: MaskingStatus;

  @Column({ type: 'text', nullable: true })
  redactedText: string | null;

  @Column({ type: 'integer', default: 0 })
  spanCount: number;

  @Column({ type: 'varchar', length: 80, nullable: true })
  errorCode: string | null;

  @OneToMany(() => MaskingSpan, (span) => span.redaction)
  spans?: MaskingSpan[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
