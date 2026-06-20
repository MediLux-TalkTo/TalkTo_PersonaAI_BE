import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async listActive(): Promise<Product[]> {
    return this.productsRepository.find({
      where: { active: true },
      order: { amountCents: 'ASC' },
    });
  }

  async findActiveById(productId: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id: productId, active: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    return product;
  }
}
