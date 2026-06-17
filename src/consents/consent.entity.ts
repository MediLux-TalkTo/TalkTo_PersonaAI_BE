import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  CONSENT_FEATURES,
  CONSENT_STATUSES,
  CONSENT_TYPES,
  ConsentFeature,
  ConsentStatus,
  ConsentType,
} from '../common/enums/consent.enums';
import { User } from '../users/user.entity';

@Entity('user_consents')
export class Consent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  subjectId: string | null;

  @Column({ type: 'enum', enum: CONSENT_TYPES, nullable: true })
  consentType: ConsentType | null;

  @Column({ type: 'enum', enum: CONSENT_FEATURES, nullable: true })
  feature: ConsentFeature | null;

  @Column({ default: true })
  required: boolean;

  @Column({ type: 'enum', enum: CONSENT_STATUSES, nullable: true })
  status: ConsentStatus | null;

  @Column({ type: 'varchar', nullable: true })
  version: string | null;

  @Column({ default: false })
  personaDisclaimerAccepted: boolean;

  @Column({ default: false })
  conversationStorageAccepted: boolean;

  @Column({ default: false })
  voiceSynthesisAccepted: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  acceptedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  withdrawnAt: Date | null;

  @ManyToOne(() => User, (user) => user.consents, { onDelete: 'CASCADE' })
  user: User;
}
