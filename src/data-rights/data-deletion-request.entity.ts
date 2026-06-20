import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  DataDeletionRequestStatus,
  DataDeletionScope,
} from './data-deletion.constants';

@Entity('data_deletion_requests')
@Index('IDX_data_deletion_requests_owner_status', ['ownerUserId', 'status'])
export class DataDeletionRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ownerUserId: string;

  @Column({ type: 'varchar', length: 30 })
  scope: DataDeletionScope;

  @Column({ type: 'uuid', nullable: true })
  subjectId: string | null;

  @Column({ type: 'uuid', nullable: true })
  recordingId: string | null;

  @Column({ type: 'varchar', length: 40, default: DataDeletionRequestStatus.REQUESTED })
  status: DataDeletionRequestStatus;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'uuid', nullable: true })
  processedByUserId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  processedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
