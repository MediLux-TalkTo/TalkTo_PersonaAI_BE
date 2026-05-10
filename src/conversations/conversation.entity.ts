import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ConversationChannel } from '../common/enums/message.enums';
import { Persona } from '../personas/persona.entity';
import { User } from '../users/user.entity';
import { Message } from './message.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  personaId: string;

  @Column({
    type: 'enum',
    enum: ConversationChannel,
  })
  channel: ConversationChannel;

  @Column({ type: 'varchar', nullable: true })
  title: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastMessageAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @ManyToOne(() => User, (user) => user.conversations, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Persona, (persona) => persona.conversations, { onDelete: 'RESTRICT' })
  persona: Persona;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];
}
