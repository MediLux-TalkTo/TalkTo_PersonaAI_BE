import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  VoicePersonaApplicationStatus,
  VoicePersonaBuildStatus,
  VoicePersonaReviewStatus,
} from './voice-persona.constants';

@Entity('voice_persona_applications')
@Index('IDX_voice_persona_applications_owner_subject', ['ownerUserId', 'subjectId'])
export class VoicePersonaApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ownerUserId: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'uuid', nullable: true })
  entitlementId: string | null;

  @Column({ type: 'varchar', length: 40, default: VoicePersonaApplicationStatus.DRAFT })
  status: VoicePersonaApplicationStatus;

  @Column({ type: 'varchar', length: 40, default: VoicePersonaReviewStatus.PENDING_REVIEW })
  documentsStatus: VoicePersonaReviewStatus;

  @Column({ type: 'varchar', length: 40, default: 'draft' })
  intakeStatus: 'draft' | 'submitted';

  @Column({ type: 'varchar', length: 40, default: VoicePersonaReviewStatus.PENDING_REVIEW })
  voiceSampleStatus: VoicePersonaReviewStatus;

  @Column({ type: 'varchar', length: 50, default: VoicePersonaBuildStatus.LOCKED_UNTIL_REQUIREMENTS })
  buildStatus: VoicePersonaBuildStatus;

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
