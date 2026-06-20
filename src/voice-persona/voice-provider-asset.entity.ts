import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const VoiceProviderAssetStatus = {
  PENDING_MANUAL_REGISTRATION: 'pending_manual_registration',
  REGISTERED: 'registered',
  FAILED: 'failed',
  DELETION_REQUESTED: 'deletion_requested',
  DELETED: 'deleted',
} as const;

export type VoiceProviderAssetStatus =
  (typeof VoiceProviderAssetStatus)[keyof typeof VoiceProviderAssetStatus];

@Entity('voice_provider_assets')
@Index('IDX_voice_provider_assets_application', ['applicationId'])
export class VoiceProviderAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  applicationId: string;

  @Column({ type: 'uuid' })
  ownerUserId: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'varchar', length: 120 })
  providerName: string;

  @Column({ type: 'varchar', length: 160 })
  externalAssetId: string;

  @Column({ type: 'varchar', length: 50, default: VoiceProviderAssetStatus.PENDING_MANUAL_REGISTRATION })
  status: VoiceProviderAssetStatus;

  @Column({ type: 'uuid' })
  reviewerUserId: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
