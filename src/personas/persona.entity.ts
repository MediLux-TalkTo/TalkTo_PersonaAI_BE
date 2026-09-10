import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Conversation } from '../conversations/conversation.entity';

export interface VoiceSettings {
  speed?: number;
  stability?: number;
  similarityBoost?: number;
  style?: number;
}

@Entity('personas')
export class Persona {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 어느 대상자의 페르소나인지. 기억 검색을 대상자별로 가르는 데 쓴다.
  // 앱 경로는 런타임 설정에서 대상자가 정해지고, 데모처럼 폴백으로 도는
  // 페르소나는 이 값으로 대상자를 안다.
  @Column({ type: 'uuid', nullable: true })
  subjectId: string | null;

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

  /**
   * 목소리 결. 사람마다 다르다. 비어 있으면 AI 서버 기본값을 쓴다.
   * { speed, stability, similarityBoost, style } — 넣은 값만 넘어간다.
   */
  @Column({ type: 'jsonb', nullable: true })
  voiceSettings: VoiceSettings | null;

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
