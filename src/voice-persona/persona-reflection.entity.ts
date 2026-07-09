import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('persona_reflections')
@Index('IDX_persona_reflections_subject', ['subjectId'])
export class PersonaReflection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ownerUserId: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'text' })
  insight: string;

  @Column({ type: 'varchar', length: 80 })
  category: string;

  @Column({ type: 'text', array: true, default: '{}' })
  evidenceMemoryIds: string[];

  @Column({ type: 'integer' })
  importance: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
