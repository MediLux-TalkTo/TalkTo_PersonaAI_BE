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

  // AI 지시(시스템 프롬프트) 전용 칸. 화면에 노출하지 않으려 기본 미선택.
  // 값이 있으면 채팅 생성 시 description 대신 이 값을 지시로 사용한다.
  @Column({ type: 'text', nullable: true, select: false })
  systemPrompt?: string | null;

  @Column({ type: 'varchar', nullable: true })
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
