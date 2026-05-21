import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { AdminService } from '../admin/admin.service';
import { AiClientService } from '../ai/ai-client.service';
import {
  SystemLogCategory,
  SystemLogSeverity,
} from '../common/enums/log.enum';
import { MemoryStatus } from '../common/enums/memory.enums';
import { MemoryEmbedding } from '../memories/memory-embedding.entity';
import { Memory } from '../memories/memory.entity';

@Injectable()
export class MemoryRetrievalService {
  constructor(
    private readonly aiClientService: AiClientService,
    private readonly adminService: AdminService,
    @InjectRepository(Memory)
    private readonly memoriesRepository: Repository<Memory>,
    @InjectRepository(MemoryEmbedding)
    private readonly memoryEmbeddingsRepository: Repository<MemoryEmbedding>,
  ) {}

  async retrieve(query: string): Promise<Memory[]> {
    const trimmed = query.trim();

    if (!trimmed) {
      return this.memoriesRepository.find({
        where: { status: MemoryStatus.ACTIVE },
        take: 3,
        order: { updatedAt: 'DESC' },
      });
    }

    const vectorMatches = await this.retrieveByVector(trimmed);

    if (vectorMatches.length > 0) {
      return vectorMatches;
    }

    return this.retrieveByKeyword(trimmed);
  }

  private async retrieveByKeyword(query: string): Promise<Memory[]> {
    return this.memoriesRepository.find({
      where: [
        { status: MemoryStatus.ACTIVE, title: ILike(`%${query}%`) },
        { status: MemoryStatus.ACTIVE, bodyMarkdown: ILike(`%${query}%`) },
      ],
      take: 3,
      order: { updatedAt: 'DESC' },
    });
  }

  private async retrieveByVector(query: string): Promise<Memory[]> {
    let queryEmbedding: number[] | null = null;

    try {
      queryEmbedding = await this.aiClientService.embed(query);
    } catch (error) {
      await this.adminService.recordLog({
        category: SystemLogCategory.MEMORY,
        severity: SystemLogSeverity.WARN,
        detail: {
          reason: 'query_embedding_failed',
          error: error instanceof Error ? error.message : 'unknown',
        },
      });
    }

    if (!queryEmbedding) {
      return [];
    }

    const embeddings = await this.memoryEmbeddingsRepository.find({
      where: {
        memory: {
          status: MemoryStatus.ACTIVE,
        },
      },
      relations: ['memory'],
    });
    const scores = new Map<string, { memory: Memory; score: number }>();

    for (const embedding of embeddings) {
      if (!embedding.embedding) {
        continue;
      }

      const score = this.cosineSimilarity(queryEmbedding, embedding.embedding);
      const current = scores.get(embedding.memoryId);

      if (!current || score > current.score) {
        scores.set(embedding.memoryId, {
          memory: embedding.memory,
          score,
        });
      }
    }

    return Array.from(scores.values())
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3)
      .map(({ memory }) => memory);
  }

  private cosineSimilarity(left: number[], right: number[]): number {
    if (left.length !== right.length || left.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let leftMagnitude = 0;
    let rightMagnitude = 0;

    for (let index = 0; index < left.length; index += 1) {
      dotProduct += left[index] * right[index];
      leftMagnitude += left[index] ** 2;
      rightMagnitude += right[index] ** 2;
    }

    const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);

    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}
