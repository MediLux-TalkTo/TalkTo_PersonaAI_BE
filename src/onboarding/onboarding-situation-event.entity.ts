import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { OnboardingSituationValue } from '../common/enums/archive.enums';

@Entity('onboarding_situation_events')
export class OnboardingSituationEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'varchar', length: 50 })
  situation: OnboardingSituationValue;

  @Column({ type: 'varchar', length: 120 })
  nextRoute: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
