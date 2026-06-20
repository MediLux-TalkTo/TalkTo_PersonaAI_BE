import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('app_events')
export class AppEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'uuid', nullable: true })
  subjectId: string | null;

  @Column({ type: 'uuid', nullable: true })
  recordingId: string | null;

  @Column({ type: 'uuid', nullable: true })
  orderId: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  payload: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
