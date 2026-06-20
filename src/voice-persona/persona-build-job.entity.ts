import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VoicePersonaBuildStatus } from './voice-persona.constants';

@Entity('persona_build_jobs')
@Index('UQ_persona_build_jobs_application', ['applicationId'], { unique: true })
export class PersonaBuildJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  applicationId: string;

  @Column({ type: 'uuid' })
  ownerUserId: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'varchar', length: 50, default: VoicePersonaBuildStatus.LOCKED_UNTIL_REQUIREMENTS })
  status: VoicePersonaBuildStatus;

  @Column({ type: 'varchar', length: 120, nullable: true })
  providerName: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  externalAssetId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
