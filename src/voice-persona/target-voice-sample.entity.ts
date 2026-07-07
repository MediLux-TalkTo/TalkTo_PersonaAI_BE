import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VoicePersonaReviewStatus } from './voice-persona.constants';

@Entity('target_voice_samples')
@Index('IDX_target_voice_samples_application', ['applicationId'])
export class TargetVoiceSample {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  applicationId: string;

  @Column({ type: 'uuid' })
  ownerUserId: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'uuid', nullable: true })
  recordingId: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  storageKey: string | null;

  @Column({ type: 'integer', nullable: true })
  startMs: number | null;

  @Column({ type: 'integer', nullable: true })
  endMs: number | null;

  @Column({ type: 'varchar', length: 40, default: VoicePersonaReviewStatus.PENDING_REVIEW })
  reviewStatus: VoicePersonaReviewStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
