import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProductFeature } from './product.constants';
import { Product } from './product.entity';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const productsRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  let productsService: ProductsService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: productsRepository,
        },
      ],
    }).compile();

    productsService = moduleRef.get(ProductsService);
  });

  it('lists active products ordered by amount', async () => {
    const product = buildProduct();
    productsRepository.find.mockResolvedValue([product]);

    await expect(productsService.listActive()).resolves.toEqual([product]);
    expect(productsRepository.find).toHaveBeenCalledWith({
      where: { active: true },
      order: { amountCents: 'ASC' },
    });
  });

  it('rejects missing active products', async () => {
    productsRepository.findOne.mockResolvedValue(null);

    await expect(productsService.findActiveById('missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});

function buildProduct(): Product {
  const product = new Product();
  product.id = 'memories_access';
  product.code = 'memories_access';
  product.feature = ProductFeature.MEMORIES;
  product.displayName = 'Memories';
  product.description = 'Unlock Memories';
  product.amountCents = 9900;
  product.currency = 'USD';
  product.active = true;
  product.createdAt = new Date('2026-06-17T00:00:00.000Z');
  product.updatedAt = new Date('2026-06-17T00:00:00.000Z');
  return product;
}
