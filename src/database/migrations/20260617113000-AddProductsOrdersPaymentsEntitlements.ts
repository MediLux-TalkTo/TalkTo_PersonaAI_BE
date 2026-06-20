import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductsOrdersPaymentsEntitlements20260617113000
  implements MigrationInterface
{
  name = 'AddProductsOrdersPaymentsEntitlements20260617113000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" character varying(80) NOT NULL,
        "code" character varying(80) NOT NULL,
        "feature" character varying(40) NOT NULL,
        "displayName" character varying(120) NOT NULL,
        "description" text NOT NULL,
        "amountCents" integer NOT NULL,
        "currency" character varying(3) NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_products_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_products_code" UNIQUE ("code"),
        CONSTRAINT "CHK_products_feature" CHECK ("feature" IN ('memories', 'voice_persona')),
        CONSTRAINT "CHK_products_amount" CHECK ("amountCents" >= 0)
      )
    `);

    await queryRunner.query(`
      INSERT INTO "products" (
        "id",
        "code",
        "feature",
        "displayName",
        "description",
        "amountCents",
        "currency"
      )
      VALUES
        (
          'memories_access',
          'memories_access',
          'memories',
          'Memories',
          'Unlock paid Memories search and archive recall.',
          9900,
          'USD'
        ),
        (
          'voice_persona_build',
          'voice_persona_build',
          'voice_persona',
          'Voice Persona',
          'Unlock verified Voice Persona build and review.',
          29900,
          'USD'
        )
    `);

    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "ownerUserId" uuid NOT NULL,
        "productId" character varying(80) NOT NULL,
        "paymentProvider" character varying(30) NOT NULL,
        "paymentStatus" character varying(30) NOT NULL,
        "amountCents" integer NOT NULL,
        "currency" character varying(3) NOT NULL,
        "providerCheckoutId" character varying(120),
        "providerPaymentId" character varying(120),
        "paidAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_orders_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_orders_owner" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_orders_product" FOREIGN KEY ("productId") REFERENCES "products"("id"),
        CONSTRAINT "CHK_orders_provider" CHECK ("paymentProvider" IN ('local')),
        CONSTRAINT "CHK_orders_payment_status" CHECK ("paymentStatus" IN ('pending', 'paid', 'failed', 'canceled')),
        CONSTRAINT "CHK_orders_amount" CHECK ("amountCents" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "payment_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "provider" character varying(30) NOT NULL,
        "providerEventId" character varying(120) NOT NULL,
        "eventType" character varying(60) NOT NULL,
        "orderId" uuid,
        "payload" jsonb NOT NULL,
        "processedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_events_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payment_events_provider_event" UNIQUE ("provider", "providerEventId"),
        CONSTRAINT "FK_payment_events_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_payment_events_provider" CHECK ("provider" IN ('local')),
        CONSTRAINT "CHK_payment_events_type" CHECK ("eventType" IN ('payment.succeeded', 'payment.failed'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "entitlements" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "ownerUserId" uuid NOT NULL,
        "productId" character varying(80) NOT NULL,
        "orderId" uuid NOT NULL,
        "feature" character varying(40) NOT NULL,
        "status" character varying(30) NOT NULL,
        "startsAt" TIMESTAMPTZ NOT NULL,
        "endsAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_entitlements_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_entitlements_order" UNIQUE ("orderId"),
        CONSTRAINT "FK_entitlements_owner" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_entitlements_product" FOREIGN KEY ("productId") REFERENCES "products"("id"),
        CONSTRAINT "FK_entitlements_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_entitlements_feature" CHECK ("feature" IN ('memories', 'voice_persona')),
        CONSTRAINT "CHK_entitlements_status" CHECK ("status" IN ('active', 'revoked'))
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_orders_owner_status_createdAt" ON "orders" ("ownerUserId", "paymentStatus", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_events_order_createdAt" ON "payment_events" ("orderId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_entitlements_owner_status" ON "entitlements" ("ownerUserId", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_entitlements_owner_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payment_events_order_createdAt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_orders_owner_status_createdAt"`);
    await queryRunner.query(`DROP TABLE "entitlements"`);
    await queryRunner.query(`DROP TABLE "payment_events"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TABLE "products"`);
  }
}
