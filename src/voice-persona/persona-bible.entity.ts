import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VoicePersonaReviewStatus } from './voice-persona.constants';

@Entity('persona_bibles')
@Index('UQ_persona_bibles_application', ['applicationId'], { unique: true })
export class PersonaBible {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  applicationId: string;

  @Column({ type: 'uuid' })
  ownerUserId: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'text' })
  contentSummary: string;

  @Column({ type: 'text', nullable: true })
  safetyNotes: string | null;

  @Column({ type: 'text', nullable: true, select: false })
  assembledInstructions: string | null;

  @Column({ type: 'varchar', length: 40, default: VoicePersonaReviewStatus.PENDING_REVIEW })
  reviewStatus: VoicePersonaReviewStatus;

  @Column({ type: 'uuid', nullable: true })
  reviewerUserId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
