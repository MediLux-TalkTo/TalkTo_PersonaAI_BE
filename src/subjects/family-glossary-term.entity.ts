import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GlossaryTermType } from '../common/enums/archive.enums';
import { Subject } from './subject.entity';

@Entity('family_glossary_terms')
export class FamilyGlossaryTerm {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  subjectId: string;

  @Column({
    type: 'enum',
    enum: GlossaryTermType,
    default: GlossaryTermType.OTHER,
  })
  termType: GlossaryTermType;

  @Column({ length: 100 })
  term: string;

  @Column({ type: 'varchar', nullable: true })
  pronunciationHint: string | null;

  @Column({ type: 'varchar', nullable: true })
  meaning: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Subject, (subject) => subject.glossaryTerms, {
    onDelete: 'CASCADE',
  })
  subject: Subject;
}
