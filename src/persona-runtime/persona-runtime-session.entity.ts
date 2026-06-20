import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('persona_runtime_sessions')
@Index('IDX_persona_runtime_sessions_owner_application', [
  'ownerUserId',
  'applicationId',
])
export class PersonaRuntimeSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ownerUserId: string;

  @Column({ type: 'uuid' })
  applicationId: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'uuid' })
  runtimeConfigId: string;

  @Column({ type: 'integer', default: 0 })
  usageCount: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
