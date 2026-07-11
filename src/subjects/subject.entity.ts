import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  SubjectAvatarType,
  type SubjectAvatarTypeValue,
  SubjectLifeStatus,
  SubjectReadinessStatus,
  type SubjectReadinessStatusValue,
} from '../common/enums/archive.enums';
import { Recording } from '../recordings/recording.entity';
import { User } from '../users/user.entity';
import { FamilyGlossaryTerm } from './family-glossary-term.entity';

export type SubjectFamilyMember = {
  readonly name: string;
  readonly relationToSubject: string | null;
  readonly addressTerms: string[];
};

@Entity('subjects')
export class Subject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ownerUserId: string;

  @Column({ length: 100 })
  displayName: string;

  @Column({ length: 50 })
  relationship: string;

  @Column({
    type: 'enum',
    enum: SubjectLifeStatus,
    default: SubjectLifeStatus.UNKNOWN,
  })
  lifeStatus: SubjectLifeStatus;

  @Column({ type: 'varchar', nullable: true })
  localeHint: string | null;

  @Column({ type: 'varchar', nullable: true })
  dialectHint: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 32, default: SubjectAvatarType.DEFAULT })
  avatarType: SubjectAvatarTypeValue;

  @Column({ type: 'integer', default: 0 })
  recordingCountCache: number;

  @Column({ type: 'integer', default: 0 })
  recordingSecondsCache: number;

  @Column({
    type: 'varchar',
    length: 32,
    default: SubjectReadinessStatus.NOT_STARTED,
  })
  memoriesStatus: SubjectReadinessStatusValue;

  @Column({
    type: 'varchar',
    length: 32,
    default: SubjectReadinessStatus.NOT_STARTED,
  })
  personaStatus: SubjectReadinessStatusValue;

  @Column({ type: 'text', nullable: true, select: false })
  assembledPersonaInstructions: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  familyMembers: SubjectFamilyMember[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerUserId' })
  owner: User;

  @OneToMany(() => FamilyGlossaryTerm, (term) => term.subject)
  glossaryTerms: FamilyGlossaryTerm[];

  @OneToMany(() => Recording, (recording) => recording.subject)
  recordings: Recording[];
}
