import { Test } from '@nestjs/testing';
import { success } from '../common/utils/api-response';
import { ProductFeature } from '../products/product.constants';
import { Entitlement } from './entitlement.entity';
import { EntitlementsController } from './entitlements.controller';
import { EntitlementsService } from './entitlements.service';
import { EntitlementStatus } from './payment-event.constants';

describe('EntitlementsController', () => {
  const entitlementsService = {
    listActiveForUser: jest.fn(),
  };
  let entitlementsController: EntitlementsController;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [EntitlementsController],
      providers: [
        {
          provide: EntitlementsService,
          useValue: entitlementsService,
        },
      ],
    }).compile();

    entitlementsController = moduleRef.get(EntitlementsController);
  });

  it('lists entitlements for the authenticated user instead of query owner input', async () => {
    const currentUser = { userId: 'd73ea1d4-7cdb-47fa-9213-2770585175bb' };
    const entitlement = buildEntitlement(currentUser.userId);
    entitlementsService.listActiveForUser.mockResolvedValue([entitlement]);

    await expect(
      entitlementsController.listEntitlements(currentUser),
    ).resolves.toEqual(success([entitlement]));

    expect(entitlementsService.listActiveForUser).toHaveBeenCalledWith(
      currentUser.userId,
    );
  });
});

function buildEntitlement(ownerUserId: string): Entitlement {
  const entitlement = new Entitlement();
  entitlement.id = 'entitlement-1';
  entitlement.ownerUserId = ownerUserId;
  entitlement.productId = 'voice_persona_build';
  entitlement.orderId = 'order-1';
  entitlement.feature = ProductFeature.VOICE_PERSONA;
  entitlement.status = EntitlementStatus.ACTIVE;
  entitlement.startsAt = new Date('2026-06-17T00:00:00.000Z');
  entitlement.endsAt = null;
  entitlement.createdAt = new Date('2026-06-17T00:00:00.000Z');
  entitlement.updatedAt = new Date('2026-06-17T00:00:00.000Z');
  return entitlement;
}
