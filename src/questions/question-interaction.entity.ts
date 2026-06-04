import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { QuestionInteractionType } from '../common/enums/archive.enums';
import { Subject } from '../subjects/subject.entity';
import { User } from '../users/user.entity';

@Entity('question_interactions')
export class QuestionInteraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  subjectId: string;

  @Column({ type: 'varchar', nullable: true })
  questionId: string | null;

  @Column({ type: 'text' })
  questionText: string;

  @Column({ type: 'varchar', nullable: true })
  category: string | null;

  @Column({
    type: 'enum',
    enum: QuestionInteractionType,
  })
  interactionType: QuestionInteractionType;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Subject, { onDelete: 'CASCADE' })
  subject: Subject;
}
