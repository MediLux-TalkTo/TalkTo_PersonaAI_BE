import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Memory } from '../memories/memory.entity';
import { Message } from './message.entity';

@Entity('message_memory_refs')
export class MessageMemoryRef {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  messageId: string;

  @Column()
  memoryId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Message, (message) => message.memoryRefs, {
    onDelete: 'CASCADE',
  })
  message: Message;

  @ManyToOne(() => Memory, (memory) => memory.messageMemoryRefs, {
    onDelete: 'CASCADE',
  })
  memory: Memory;
}
