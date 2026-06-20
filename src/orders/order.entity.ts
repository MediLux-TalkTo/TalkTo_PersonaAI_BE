import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '../products/product.entity';
import { Recording } from '../recordings/recording.entity';
import { OrderPaymentStatus, PaymentProvider } from './order.constants';

@Entity('orders')
@Index('IDX_orders_target_recording', ['targetRecordingId'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ownerUserId: string;

  @Column({ type: 'varchar', length: 80 })
  productId: string;

  @ManyToOne(() => Product, { eager: false })
  @JoinColumn({ name: 'productId' })
  product?: Product;

  @Column({ type: 'varchar', length: 30 })
  paymentProvider: PaymentProvider;

  @Column({ type: 'varchar', length: 30 })
  paymentStatus: OrderPaymentStatus;

  @Column({ type: 'integer' })
  amountCents: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'uuid', nullable: true })
  targetRecordingId: string | null;

  @ManyToOne(() => Recording, { eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'targetRecordingId' })
  targetRecording?: Recording | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  providerCheckoutId?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  providerPaymentId?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
