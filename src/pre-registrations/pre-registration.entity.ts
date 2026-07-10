import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  type PreRegistrationBenefitStatus,
  type PreRegistrationContactType,
  type PreRegistrationInterview,
  type PreRegistrationParticipationType,
  type PreRegistrationReason,
  type PreRegistrationStatus,
  type PreRegistrationSurvey,
  type PreRegistrationUtm,
} from './pre-registration.constants';

@Entity('pre_registrations')
@Index('UQ_pre_registrations_contactNormalized', ['contactNormalized'], { unique: true })
@Index('UQ_pre_registrations_idempotencyKey', ['idempotencyKey'], { unique: true })
@Index('IDX_pre_registrations_status_createdAt', ['status', 'createdAt'])
@Index('IDX_pre_registrations_participation_createdAt', ['participationType', 'createdAt'])
export class PreRegistration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  contactType: PreRegistrationContactType;

  @Column({ type: 'varchar', length: 255 })
  contact: string;

  @Column({ type: 'varchar', length: 255 })
  contactNormalized: string;

  @Column({ type: 'varchar', length: 40 })
  participationType: PreRegistrationParticipationType;

  @Column({ type: 'varchar', length: 80 })
  reason: PreRegistrationReason;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reasonOther: string | null;

  @Column({ type: 'boolean' })
  contactConsent: boolean;

  @Column({ type: 'varchar', length: 80 })
  contactConsentVersion: string;

  @Column({ type: 'jsonb', nullable: true })
  survey: PreRegistrationSurvey | null;

  @Column({ type: 'jsonb', nullable: true })
  interview: PreRegistrationInterview | null;

  @Column({ type: 'jsonb', default: {} })
  utm: PreRegistrationUtm;

  @Column({ type: 'varchar', length: 40 })
  status: PreRegistrationStatus;

  @Column({ type: 'varchar', length: 40 })
  benefitStatus: PreRegistrationBenefitStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  operatorNotes: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  idempotencyKey: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  contactedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
