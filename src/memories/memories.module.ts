import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemoryEmbedding } from './memory-embedding.entity';
import { MemoryRevision } from './memory-revision.entity';
import { Memory } from './memory.entity';
import { MemoriesController } from './memories.controller';
import { MemoriesService } from './memories.service';

@Module({
  imports: [TypeOrmModule.forFeature([Memory, MemoryRevision, MemoryEmbedding])],
  controllers: [MemoriesController],
  providers: [MemoriesService],
  exports: [MemoriesService],
})
export class MemoriesModule {}
