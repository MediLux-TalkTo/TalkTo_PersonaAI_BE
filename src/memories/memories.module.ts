import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from '../admin/admin.module';
import { AiModule } from '../ai/ai.module';
import { MemoryEmbedding } from './memory-embedding.entity';
import { MemoryRevision } from './memory-revision.entity';
import { Memory } from './memory.entity';
import { MemoriesController } from './memories.controller';
import { MemoriesService } from './memories.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Memory, MemoryRevision, MemoryEmbedding]),
    AiModule,
    AdminModule,
  ],
  controllers: [MemoriesController],
  providers: [MemoriesService],
  exports: [MemoriesService],
})
export class MemoriesModule {}
