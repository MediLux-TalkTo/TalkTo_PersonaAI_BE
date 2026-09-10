import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, IsNull, Repository } from 'typeorm';
import { AdminService } from '../admin/admin.service';
import {
  AiClientService,
  AiProviderConsentContext,
} from '../ai/ai-client.service';
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

  async retrieve(
    query: string,
    consentContext: AiProviderConsentContext,
  ): Promise<Memory[]> {
    const trimmed = query.trim();
    const subjectId = consentContext.subjectId;

    if (!trimmed) {
      return this.memoriesRepository.find({
        where: this.subjectScope(subjectId),
        take: 3,
        order: { updatedAt: 'DESC' },
      });
    }

    const vectorMatches = await this.retrieveByVector(trimmed, consentContext);

    if (vectorMatches.length > 0) {
      return vectorMatches;
    }

    return this.retrieveByKeyword(trimmed, subjectId);
  }

  /**
   * 대상자별로 기억을 가른다. subjectId 가 없는 행은 대상자 구분이 생기기 전에
   * 들어온 것이라 당분간 함께 본다. 운영 데이터를 채우고 나면 IS NULL 절을 뺀다.
   */
  private subjectScope(
    subjectId: string | undefined,
    extra: Record<string, unknown> = {},
  ): Record<string, unknown>[] {
    const base = { status: MemoryStatus.ACTIVE, ...extra };

    if (!subjectId) {
      return [base];
    }

    return [
      { ...base, subjectId },
      { ...base, subjectId: IsNull() },
    ];
  }

  private async retrieveByKeyword(
    query: string,
    subjectId?: string,
  ): Promise<Memory[]> {
    return this.memoriesRepository.find({
      where: [
        ...this.subjectScope(subjectId, { title: ILike(`%${query}%`) }),
        ...this.subjectScope(subjectId, { bodyMarkdown: ILike(`%${query}%`) }),
      ],
      take: 3,
      order: { updatedAt: 'DESC' },
    });
  }

  private async retrieveByVector(
    query: string,
    consentContext: AiProviderConsentContext,
  ): Promise<Memory[]> {
    let queryEmbedding: number[] | null = null;

    try {
      queryEmbedding = await this.aiClientService.embed(query, consentContext);
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

    const pgvectorMatches = await this.retrieveByPgvector(
      queryEmbedding,
      consentContext.subjectId,
    );

    if (pgvectorMatches.length > 0) {
      return pgvectorMatches;
    }

    return this.retrieveByApplicationCosine(queryEmbedding, consentContext.subjectId);
  }

  private async retrieveByPgvector(
    queryEmbedding: number[],
    subjectId?: string,
  ): Promise<Memory[]> {
    const vectorLiteral = this.toVectorLiteral(queryEmbedding);

    if (!vectorLiteral) {
      return [];
    }

    try {
      const rows = await this.memoryEmbeddingsRepository.query(
        `
          WITH ranked_memories AS (
            SELECT
              m.*,
              me."embeddingVector" <=> $1::vector AS distance,
              row_number() OVER (
                PARTITION BY m."id"
                ORDER BY me."embeddingVector" <=> $1::vector
              ) AS rank
            FROM "memory_embeddings" me
            INNER JOIN "memories" m ON m."id" = me."memoryId"
            WHERE m."status" = $2
              AND me."embeddingVector" IS NOT NULL
              AND ($3::uuid IS NULL OR m."subjectId" = $3::uuid OR m."subjectId" IS NULL)
          )
          SELECT *
          FROM ranked_memories
          WHERE rank = 1
          ORDER BY distance ASC
          LIMIT 3
        `,
        [vectorLiteral, MemoryStatus.ACTIVE, subjectId ?? null],
      );

      return rows.map((row: Record<string, unknown>) =>
        this.memoriesRepository.create(row as Partial<Memory>),
      );
    } catch (error) {
      await this.adminService.recordLog({
        category: SystemLogCategory.MEMORY,
        severity: SystemLogSeverity.WARN,
        detail: {
          reason: 'pgvector_memory_search_failed',
          error: error instanceof Error ? error.message : 'unknown',
        },
      });

      return [];
    }
  }

  private async retrieveByApplicationCosine(
    queryEmbedding: number[],
    subjectId?: string,
  ): Promise<Memory[]> {
    const embeddings = await this.memoryEmbeddingsRepository.find({
      where: this.subjectScope(subjectId).map((memory) => ({ memory })),
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

  private toVectorLiteral(vector: number[]): string | null {
    if (vector.length === 0 || vector.some((value) => !Number.isFinite(value))) {
      return null;
    }

    return `[${vector.join(',')}]`;
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
