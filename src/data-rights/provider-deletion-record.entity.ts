import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProviderDeletionStatus } from './data-deletion.constants';

@Entity('provider_deletion_records')
@Index('IDX_provider_deletion_records_request', ['dataDeletionRequestId'])
export class ProviderDeletionRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  dataDeletionRequestId: string;

  @Column({ type: 'uuid' })
  ownerUserId: string;

  @Column({ type: 'uuid', nullable: true })
  subjectId: string | null;

  @Column({ type: 'uuid', nullable: true })
  providerAssetId: string | null;

  @Column({ type: 'varchar', length: 120 })
  providerName: string;

  @Column({ type: 'varchar', length: 160 })
  externalAssetId: string;

  @Column({ type: 'varchar', length: 40, default: ProviderDeletionStatus.PENDING_MANUAL })
  status: ProviderDeletionStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
