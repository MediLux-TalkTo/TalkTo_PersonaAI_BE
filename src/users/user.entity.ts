import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { Consent } from '../consents/consent.entity';
import { Conversation } from '../conversations/conversation.entity';
import { Feedback } from '../feedback/feedback.entity';
import { MemoryRevision } from '../memories/memory-revision.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, nullable: true })
  email: string | null;

  @Column({ unique: true, nullable: true })
  phoneNumber: string | null;

  @Column()
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.FAMILY,
  })
  role: Role;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.INVITED,
  })
  status: UserStatus;

  @Column({ nullable: true })
  refreshTokenHash: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Consent, (consent) => consent.user)
  consents: Consent[];

  @OneToMany(() => Conversation, (conversation) => conversation.user)
  conversations: Conversation[];

  @OneToMany(() => Feedback, (feedback) => feedback.user)
  feedbacks: Feedback[];

  @OneToMany(() => MemoryRevision, (revision) => revision.actorUser)
  memoryRevisions: MemoryRevision[];
}
