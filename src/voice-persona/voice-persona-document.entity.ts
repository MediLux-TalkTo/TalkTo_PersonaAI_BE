import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VoicePersonaReviewStatus } from './voice-persona.constants';

@Entity('voice_persona_documents')
@Index('IDX_voice_persona_documents_application', ['applicationId'])
export class VoicePersonaDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  applicationId: string;

  @Column({ type: 'uuid' })
  ownerUserId: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Column({ type: 'varchar', length: 120 })
  mimeType: string;

  @Column({ type: 'bigint' })
  fileSizeBytes: string;

  @Column({ type: 'varchar', length: 500 })
  storageKey: string;

  @Column({ type: 'varchar', length: 40, default: VoicePersonaReviewStatus.PENDING_REVIEW })
  reviewStatus: VoicePersonaReviewStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
