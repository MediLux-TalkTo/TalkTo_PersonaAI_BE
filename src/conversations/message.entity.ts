import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  MessageInputMode,
  MessageSenderType,
  MessageStatus,
} from '../common/enums/message.enums';
import { Feedback } from '../feedback/feedback.entity';
import { Conversation } from './conversation.entity';
import { MessageMemoryRef } from './message-memory-ref.entity';
import { VoiceArtifact } from './voice-artifact.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversationId: string;

  @Column({
    type: 'enum',
    enum: MessageSenderType,
  })
  senderType: MessageSenderType;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: MessageInputMode,
    default: MessageInputMode.TEXT,
  })
  inputMode: MessageInputMode;

  @Column({ type: 'text', array: true, default: '{}' })
  retrievedMemoryIds: string[];

  @Column({ type: 'integer', nullable: true })
  latencyMs: number | null;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.PENDING,
  })
  status: MessageStatus;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  conversation: Conversation;

  @OneToMany(() => MessageMemoryRef, (ref) => ref.message)
  memoryRefs: MessageMemoryRef[];

  @OneToMany(() => VoiceArtifact, (artifact) => artifact.message)
  voiceArtifacts: VoiceArtifact[];

  @OneToMany(() => Feedback, (feedback) => feedback.message)
  feedbacks: Feedback[];
}
