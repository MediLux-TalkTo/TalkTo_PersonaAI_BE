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
import { Order } from '../orders/order.entity';
import { Entitlement } from '../payments/entitlement.entity';
import { Recording } from '../recordings/recording.entity';
import { Subject } from '../subjects/subject.entity';
import { AnalysisJobStatus } from './analysis-job.constants';

const ACTIVE_JOB_INDEX_WHERE =
  "\"status\" IN ('queued', 'leased', 'preprocessing', 'stt_processing', 'redaction_pending', 'segmenting', 'embedding', 'indexing', 'failed_retryable')";

@Entity('analysis_jobs')
@Index('IDX_analysis_jobs_owner_status_createdAt', [
  'ownerUserId',
  'status',
  'createdAt',
])
@Index('IDX_analysis_jobs_recording_status', ['recordingId', 'status'])
@Index('UQ_analysis_jobs_recording_active', ['recordingId'], {
  unique: true,
  where: ACTIVE_JOB_INDEX_WHERE,
})
@Index('UQ_analysis_jobs_order_recording_active', ['orderId', 'recordingId'], {
  unique: true,
  where: ACTIVE_JOB_INDEX_WHERE,
})
export class AnalysisJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ownerUserId: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @ManyToOne(() => Subject, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subjectId' })
  subject?: Subject;

  @Column({ type: 'uuid' })
  recordingId: string;

  @ManyToOne(() => Recording, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recordingId' })
  recording?: Recording;

  @Column({ type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order?: Order;

  @Column({ type: 'uuid' })
  entitlementId: string;

  @ManyToOne(() => Entitlement, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entitlementId' })
  entitlement?: Entitlement;

  @Column({ type: 'varchar', length: 40 })
  status: AnalysisJobStatus;

  @Column({ type: 'varchar', length: 80, nullable: true })
  failureCode: string | null;

  @Column({ type: 'text', nullable: true })
  failureMessage: string | null;

  @Column({ type: 'integer', default: 0 })
  retryCount: number;

  @Column({ type: 'integer', default: 3 })
  maxRetries: number;

  @Column({ type: 'varchar', length: 120, nullable: true })
  leaseOwner: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  leaseExpiresAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  timeoutAt: Date | null;

  @Column({ type: 'timestamptz' })
  statusChangedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  failedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
