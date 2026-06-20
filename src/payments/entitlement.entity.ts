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
import { Order } from '../orders/order.entity';
import { ProductFeature } from '../products/product.constants';
import { Product } from '../products/product.entity';
import { EntitlementStatus } from './payment-event.constants';

@Entity('entitlements')
@Index('UQ_entitlements_order', ['orderId'], { unique: true })
export class Entitlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ownerUserId: string;

  @Column({ type: 'varchar', length: 80 })
  productId: string;

  @ManyToOne(() => Product, { eager: false })
  @JoinColumn({ name: 'productId' })
  product?: Product;

  @Column({ type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, { eager: false })
  @JoinColumn({ name: 'orderId' })
  order?: Order;

  @Column({ type: 'varchar', length: 40 })
  feature: ProductFeature;

  @Column({ type: 'varchar', length: 30 })
  status: EntitlementStatus;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endsAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
