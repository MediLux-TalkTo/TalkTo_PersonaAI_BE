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
import { Recording } from './recording.entity';
import type {
  RecordingUploadFailureCodeValue,
  RecordingUploadIntentStatusValue,
  RecordingUploadPlatformValue,
  RecordingUploadSourceValue,
} from './upload-intent.constants';
import {
  RecordingUploadIntentStatus,
  RecordingUploadPlatform,
  RecordingUploadSource,
} from './upload-intent.constants';

@Entity('recording_upload_intents')
@Index('IDX_recording_upload_intents_recording_createdAt', [
  'recordingId',
  'createdAt',
])
@Index('IDX_recording_upload_intents_owner_status', ['ownerUserId', 'status'])
export class RecordingUploadIntent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  recordingId: string;

  @Column({ type: 'uuid' })
  ownerUserId: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ length: 80, default: RecordingUploadSource.APP_RECORDING })
  source: RecordingUploadSourceValue;

  @Column({ length: 40, default: RecordingUploadPlatform.IOS })
  platform: RecordingUploadPlatformValue;

  @Column({ type: 'boolean', default: true })
  singleFile: boolean;

  @Column({ length: 40, default: RecordingUploadIntentStatus.UPLOADING })
  status: RecordingUploadIntentStatusValue;

  @Column({ type: 'varchar', length: 80, nullable: true })
  failureCode: RecordingUploadFailureCodeValue | null;

  @Column({ length: 255 })
  originalFilename: string;

  @Column({ length: 120 })
  mimeType: string;

  @Column({ type: 'bigint' })
  expectedFileSizeBytes: string;

  @Column({ type: 'varchar' })
  storageKey: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  canceledAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Recording, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recordingId' })
  recording: Recording;
}
