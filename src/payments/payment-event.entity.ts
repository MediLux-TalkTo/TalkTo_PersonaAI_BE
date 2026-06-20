import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentProvider } from '../orders/order.constants';
import { PaymentEventType } from './payment-event.constants';

@Entity('payment_events')
@Index('UQ_payment_events_provider_event', ['provider', 'providerEventId'], {
  unique: true,
})
export class PaymentEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 30 })
  provider: PaymentProvider;

  @Column({ type: 'varchar', length: 120 })
  providerEventId: string;

  @Column({ type: 'varchar', length: 60 })
  eventType: PaymentEventType;

  @Column({ type: 'uuid', nullable: true })
  orderId?: string | null;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ type: 'timestamptz', nullable: true })
  processedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
