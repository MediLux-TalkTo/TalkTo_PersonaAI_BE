import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('user_consents')
export class Consent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ default: false })
  personaDisclaimerAccepted: boolean;

  @Column({ default: false })
  conversationStorageAccepted: boolean;

  @Column({ default: false })
  voiceSynthesisAccepted: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  acceptedAt: Date;

  @ManyToOne(() => User, (user) => user.consents, { onDelete: 'CASCADE' })
  user: User;
}
