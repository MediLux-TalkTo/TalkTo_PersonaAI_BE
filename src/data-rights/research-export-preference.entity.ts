import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('research_export_preferences')
@Index('UQ_research_export_preferences_user', ['userId'], { unique: true })
export class ResearchExportPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'boolean', default: false })
  optedIn: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  optedInAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  withdrawnAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
