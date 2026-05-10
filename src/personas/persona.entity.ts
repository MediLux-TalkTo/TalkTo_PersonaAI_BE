import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Conversation } from '../conversations/conversation.entity';

@Entity('personas')
export class Persona {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  displayName: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ nullable: true })
  profileImageUrl: string | null;

  @Column({ default: 'default-voice' })
  voiceId: string;

  @Column({ default: 'default-model' })
  modelId: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Conversation, (conversation) => conversation.persona)
  conversations: Conversation[];
}
