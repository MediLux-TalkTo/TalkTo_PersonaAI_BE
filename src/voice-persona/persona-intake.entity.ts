import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('persona_intakes')
@Index('UQ_persona_intakes_application', ['applicationId'], { unique: true })
export class PersonaIntake {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  applicationId: string;

  @Column({ type: 'uuid' })
  ownerUserId: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'jsonb', default: [] })
  sections: Array<{ sectionKey: string; answers: Record<string, unknown> }>;

  @Column({ type: 'varchar', length: 40, default: 'draft' })
  status: 'draft' | 'submitted';

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
