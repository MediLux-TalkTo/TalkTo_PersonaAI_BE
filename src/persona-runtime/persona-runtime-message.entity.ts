import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('persona_runtime_messages')
@Index('IDX_persona_runtime_messages_session_createdAt', ['sessionId', 'createdAt'])
export class PersonaRuntimeMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sessionId: string;

  @Column({ type: 'uuid' })
  ownerUserId: string;

  @Column({ type: 'varchar', length: 20 })
  role: 'user' | 'assistant';

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'text', array: true, default: '{}' })
  sourceSegmentIds: string[];

  @Column({ type: 'varchar', length: 40, default: 'allowed' })
  safetyStatus: 'allowed' | 'blocked' | 'fallback';

  @Column({ type: 'varchar', length: 500, nullable: true })
  audioStorageKey: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  audioPlaybackUrl: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
