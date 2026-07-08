import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  RecordingAnalysisStatus,
  RecordingUploadStatus,
} from '../common/enums/archive.enums';
import { Subject } from '../subjects/subject.entity';
import { User } from '../users/user.entity';

export const RecordingArchiveStatus = {
  PENDING_UPLOAD: 'pending_upload',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  DELETION_REQUESTED: 'deletion_requested',
  DELETED: 'deleted',
} as const;

export type RecordingArchiveStatus =
  (typeof RecordingArchiveStatus)[keyof typeof RecordingArchiveStatus];

@Entity('recordings')
export class Recording {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ownerUserId: string;

  @Column()
  subjectId: string;

  @Column({ length: 255 })
  originalFilename: string;

  @Column({ length: 120 })
  mimeType: string;

  @Column({ type: 'bigint' })
  fileSizeBytes: string;

  @Column({ type: 'integer', nullable: true })
  durationSeconds: number | null;

  @Column({ type: 'varchar', nullable: true })
  storageKey: string | null;

  @Column({ type: 'varchar', nullable: true })
  fileHash: string | null;

  @Column({ type: 'text', nullable: true })
  memo: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  conversationPartnerName: string | null;

  @Column({ type: 'varchar', nullable: true })
  relatedQuestionId: string | null;

  @Column({ type: 'text', nullable: true })
  relatedQuestionText: string | null;

  @Column({
    type: 'varchar',
    length: 40,
    default: RecordingArchiveStatus.PENDING_UPLOAD,
  })
  archiveStatus: RecordingArchiveStatus;

  @Column({
    type: 'enum',
    enum: RecordingUploadStatus,
    default: RecordingUploadStatus.CREATED,
  })
  uploadStatus: RecordingUploadStatus;

  @Column({
    type: 'enum',
    enum: RecordingAnalysisStatus,
    default: RecordingAnalysisStatus.NOT_REQUESTED,
  })
  analysisStatus: RecordingAnalysisStatus;

  @Column({ type: 'timestamptz', nullable: true })
  uploadedAt: Date | null;

  @Column({ length: 40, default: 'not_analyzed' })
  analysisStage: string;

  @Column({ length: 80, default: 'locked_until_memories' })
  memoriesStatus: string;

  @Column({ length: 40, default: 'not_supported' })
  checksumStatus: string;

  @Column({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerUserId' })
  owner: User;

  @ManyToOne(() => Subject, (subject) => subject.recordings, {
    onDelete: 'CASCADE',
  })
  subject: Subject;
}
