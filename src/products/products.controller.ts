import { Controller, Get } from '@nestjs/common';
import { success } from '../common/utils/api-response';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async listProducts() {
    return success(await this.productsService.listActive());
  }
}
