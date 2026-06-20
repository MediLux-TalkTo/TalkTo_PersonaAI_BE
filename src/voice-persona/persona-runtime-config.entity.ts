import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('persona_runtime_configs')
@Index('UQ_persona_runtime_configs_application', ['applicationId'], { unique: true })
export class PersonaRuntimeConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  applicationId: string;

  @Column({ type: 'uuid' })
  ownerUserId: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'uuid' })
  personaBibleId: string;

  @Column({ type: 'uuid' })
  providerAssetId: string;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  enabledAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
