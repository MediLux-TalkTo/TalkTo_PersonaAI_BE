import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema20260510073000 implements MigrationInterface {
  name = 'InitialSchema20260510073000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(
      `CREATE TYPE "users_role_enum" AS ENUM ('FAMILY', 'ADMIN')`,
    );
    await queryRunner.query(
      `CREATE TYPE "users_status_enum" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "conversations_channel_enum" AS ENUM ('TEXT', 'VOICE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "messages_sender_type_enum" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM')`,
    );
    await queryRunner.query(
      `CREATE TYPE "messages_input_mode_enum" AS ENUM ('TEXT', 'VOICE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "messages_status_enum" AS ENUM ('PENDING', 'COMPLETED', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "memories_status_enum" AS ENUM ('ACTIVE', 'INACTIVE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "memory_revisions_action_enum" AS ENUM ('CREATE', 'UPDATE', 'DEACTIVATE', 'REEMBED_REQUESTED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "feedbacks_rating_enum" AS ENUM ('UP', 'DOWN')`,
    );
    await queryRunner.query(
      `CREATE TYPE "system_logs_category_enum" AS ENUM ('LLM', 'STT', 'TTS', 'AUTH', 'MEMORY', 'SYSTEM')`,
    );
    await queryRunner.query(
      `CREATE TYPE "system_logs_severity_enum" AS ENUM ('INFO', 'WARN', 'ERROR')`,
    );

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(100) NOT NULL,
        "email" character varying,
        "phoneNumber" character varying,
        "passwordHash" character varying NOT NULL,
        "role" "users_role_enum" NOT NULL DEFAULT 'FAMILY',
        "status" "users_status_enum" NOT NULL DEFAULT 'INVITED',
        "refreshTokenHash" character varying,
        "lastLoginAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "UQ_users_phoneNumber" UNIQUE ("phoneNumber")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "personas" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "displayName" character varying(100) NOT NULL,
        "description" text NOT NULL,
        "profileImageUrl" character varying,
        "voiceId" character varying NOT NULL DEFAULT 'default-voice',
        "modelId" character varying NOT NULL DEFAULT 'default-model',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_personas_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_consents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "personaDisclaimerAccepted" boolean NOT NULL DEFAULT false,
        "conversationStorageAccepted" boolean NOT NULL DEFAULT false,
        "voiceSynthesisAccepted" boolean NOT NULL DEFAULT false,
        "acceptedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_consents_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_consents_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "personaId" uuid NOT NULL,
        "channel" "conversations_channel_enum" NOT NULL,
        "title" character varying,
        "startedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "lastMessageAt" TIMESTAMPTZ,
        "endedAt" TIMESTAMPTZ,
        CONSTRAINT "PK_conversations_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_conversations_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_conversations_persona" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "conversationId" uuid NOT NULL,
        "senderType" "messages_sender_type_enum" NOT NULL,
        "content" text NOT NULL,
        "inputMode" "messages_input_mode_enum" NOT NULL DEFAULT 'TEXT',
        "retrievedMemoryIds" text[] NOT NULL DEFAULT '{}',
        "latencyMs" integer,
        "status" "messages_status_enum" NOT NULL DEFAULT 'PENDING',
        "failureReason" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_messages_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_messages_conversation" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "memories" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" character varying(120) NOT NULL,
        "memoryType" character varying(50) NOT NULL,
        "relatedPeople" text[] NOT NULL DEFAULT '{}',
        "relatedPeriod" character varying,
        "bodyMarkdown" text NOT NULL,
        "tags" text[] NOT NULL DEFAULT '{}',
        "confidenceScore" double precision NOT NULL DEFAULT 0.5,
        "status" "memories_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "createdBy" character varying,
        "updatedBy" character varying,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_memories_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "message_memory_refs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "messageId" uuid NOT NULL,
        "memoryId" uuid NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_message_memory_refs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_message_memory_refs_message" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_message_memory_refs_memory" FOREIGN KEY ("memoryId") REFERENCES "memories"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "voice_artifacts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "messageId" uuid NOT NULL,
        "audioInputUrl" character varying,
        "sttText" text,
        "ttsAudioUrl" character varying,
        "sttStatus" character varying NOT NULL DEFAULT 'COMPLETED',
        "ttsStatus" character varying NOT NULL DEFAULT 'COMPLETED',
        "fallbackTextUsed" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_voice_artifacts_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_voice_artifacts_message" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "memory_revisions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "memoryId" uuid NOT NULL,
        "action" "memory_revisions_action_enum" NOT NULL,
        "beforeSnapshot" jsonb,
        "afterSnapshot" jsonb,
        "actorUserId" uuid,
        "reason" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_memory_revisions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_memory_revisions_memory" FOREIGN KEY ("memoryId") REFERENCES "memories"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_memory_revisions_actor" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "memory_embeddings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "memoryId" uuid NOT NULL,
        "chunkIndex" integer NOT NULL,
        "chunkText" text NOT NULL,
        "embedding" float8 array,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_memory_embeddings_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_memory_embeddings_memory" FOREIGN KEY ("memoryId") REFERENCES "memories"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "feedbacks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "messageId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "rating" "feedbacks_rating_enum" NOT NULL,
        "tags" text[] NOT NULL DEFAULT '{}',
        "comment" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_feedbacks_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_feedbacks_message_user" UNIQUE ("messageId", "userId"),
        CONSTRAINT "FK_feedbacks_message" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_feedbacks_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "system_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "category" "system_logs_category_enum" NOT NULL,
        "severity" "system_logs_severity_enum" NOT NULL DEFAULT 'INFO',
        "conversationId" character varying,
        "messageId" character varying,
        "detail" jsonb NOT NULL DEFAULT '{}',
        "occurredAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_system_logs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_conversations_user_lastMessageAt" ON "conversations" ("userId", "lastMessageAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_conversation_createdAt" ON "messages" ("conversationId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_memories_status_updatedAt" ON "memories" ("status", "updatedAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_system_logs_category_occurredAt" ON "system_logs" ("category", "occurredAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_system_logs_category_occurredAt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_memories_status_updatedAt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_messages_conversation_createdAt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_conversations_user_lastMessageAt"`);

    await queryRunner.query(`DROP TABLE "system_logs"`);
    await queryRunner.query(`DROP TABLE "feedbacks"`);
    await queryRunner.query(`DROP TABLE "memory_embeddings"`);
    await queryRunner.query(`DROP TABLE "memory_revisions"`);
    await queryRunner.query(`DROP TABLE "voice_artifacts"`);
    await queryRunner.query(`DROP TABLE "message_memory_refs"`);
    await queryRunner.query(`DROP TABLE "memories"`);
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP TABLE "conversations"`);
    await queryRunner.query(`DROP TABLE "user_consents"`);
    await queryRunner.query(`DROP TABLE "personas"`);
    await queryRunner.query(`DROP TABLE "users"`);

    await queryRunner.query(`DROP TYPE "system_logs_severity_enum"`);
    await queryRunner.query(`DROP TYPE "system_logs_category_enum"`);
    await queryRunner.query(`DROP TYPE "feedbacks_rating_enum"`);
    await queryRunner.query(`DROP TYPE "memory_revisions_action_enum"`);
    await queryRunner.query(`DROP TYPE "memories_status_enum"`);
    await queryRunner.query(`DROP TYPE "messages_status_enum"`);
    await queryRunner.query(`DROP TYPE "messages_input_mode_enum"`);
    await queryRunner.query(`DROP TYPE "messages_sender_type_enum"`);
    await queryRunner.query(`DROP TYPE "conversations_channel_enum"`);
    await queryRunner.query(`DROP TYPE "users_status_enum"`);
    await queryRunner.query(`DROP TYPE "users_role_enum"`);
  }
}
