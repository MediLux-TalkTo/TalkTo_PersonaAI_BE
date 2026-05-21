import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from '../admin/admin.module';
import { AiModule } from '../ai/ai.module';
import { MemoriesModule } from '../memories/memories.module';
import { MemoryEmbedding } from '../memories/memory-embedding.entity';
import { Memory } from '../memories/memory.entity';
import { PersonasModule } from '../personas/personas.module';
import { StorageModule } from '../storage/storage.module';
import { ChatRuntimeService } from './chat-runtime.service';
import { Conversation } from './conversation.entity';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { MemoryRetrievalService } from './memory-retrieval.service';
import { MessageMemoryRef } from './message-memory-ref.entity';
import { Message } from './message.entity';
import { VoiceArtifact } from './voice-artifact.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      Message,
      MessageMemoryRef,
      VoiceArtifact,
      Memory,
      MemoryEmbedding,
    ]),
    AiModule,
    MemoriesModule,
    PersonasModule,
    StorageModule,
    AdminModule,
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService, ChatRuntimeService, MemoryRetrievalService],
})
export class ConversationsModule {}
