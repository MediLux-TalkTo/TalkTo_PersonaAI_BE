import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Message } from './message.entity';

@Entity('voice_artifacts')
export class VoiceArtifact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  messageId: string;

  @Column({ type: 'varchar', nullable: true })
  audioInputUrl: string | null;

  @Column({ type: 'text', nullable: true })
  sttText: string | null;

  @Column({ type: 'text', nullable: true })
  ttsAudioUrl: string | null;

  @Column({ default: 'COMPLETED' })
  sttStatus: string;

  @Column({ default: 'COMPLETED' })
  ttsStatus: string;

  @Column({ default: false })
  fallbackTextUsed: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Message, (message) => message.voiceArtifacts, {
    onDelete: 'CASCADE',
  })
  message: Message;
}
