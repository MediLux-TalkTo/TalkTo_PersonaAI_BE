import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductFeature } from './product.constants';

@Entity('products')
export class Product {
  @PrimaryColumn({ type: 'varchar', length: 80 })
  id: string;

  @Column({ type: 'varchar', length: 80, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 40 })
  feature: ProductFeature;

  @Column({ type: 'varchar', length: 120 })
  displayName: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'integer' })
  amountCents: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
