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

  @Column({ type: 'varchar', nullable: true })
  relatedQuestionId: string | null;

  @Column({ type: 'text', nullable: true })
  relatedQuestionText: string | null;

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
