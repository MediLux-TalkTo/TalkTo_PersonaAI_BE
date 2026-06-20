import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import {
  AiClientService,
  AiProviderConsentContext,
} from '../ai/ai-client.service';
import { AnalysisEmbedding } from '../analysis/analysis-embedding.entity';
import { AnalysisJobStatus } from '../analysis/analysis-job.constants';
import { AnalysisJob } from '../analysis/analysis-job.entity';
import { MemorySegment } from '../analysis/memory-segment.entity';
import { ConsentFeature } from '../common/enums/consent.enums';
import { ConsentsService } from '../consents/consents.service';
import { Entitlement } from '../payments/entitlement.entity';
import { EntitlementStatus } from '../payments/payment-event.constants';
import { ProductFeature } from '../products/product.constants';
import {
  MemoriesStatusDto,
  MemoriesSearchResultDto,
  MemorySearchSegmentDto,
} from './dto/memories-search-response.dto';
import { MemoriesStatusQueryDto, SearchMemoriesDto } from './dto/memories-search.dto';

const DEFAULT_SEARCH_LIMIT = 5;
const LOW_CONFIDENCE_THRESHOLD = 0.18;

@Injectable()
export class MemoriesSearchService {
  constructor(
    @InjectRepository(MemorySegment)
    private readonly memorySegmentsRepository: Repository<MemorySegment>,
    @InjectRepository(AnalysisEmbedding)
    private readonly embeddingsRepository: Repository<AnalysisEmbedding>,
    @InjectRepository(AnalysisJob)
    private readonly analysisJobsRepository: Repository<AnalysisJob>,
    @InjectRepository(Entitlement)
    private readonly entitlementsRepository: Repository<Entitlement>,
    private readonly consentsService: ConsentsService,
    private readonly aiClientService: AiClientService,
  ) {}

  async getStatus(
    ownerUserId: string,
    query: MemoriesStatusQueryDto,
  ): Promise<MemoriesStatusDto> {
    const entitled = await this.hasActiveMemoriesEntitlement(ownerUserId);
    const where: FindOptionsWhere<MemorySegment> = {
      ownerUserId,
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
    };
    const indexedSegmentCount = await this.memorySegmentsRepository.count({ where });
    const completedJobs = await this.analysisJobsRepository.find({
      where: {
        ownerUserId,
        ...(query.subjectId ? { subjectId: query.subjectId } : {}),
        status: AnalysisJobStatus.COMPLETED,
      },
      order: { completedAt: 'DESC' },
      take: 1,
    });

    return {
      entitled,
      searchable: entitled && indexedSegmentCount > 0,
      indexedSegmentCount,
      completedJobCount: await this.analysisJobsRepository.count({
        where: {
          ownerUserId,
          ...(query.subjectId ? { subjectId: query.subjectId } : {}),
          status: AnalysisJobStatus.COMPLETED,
        },
      }),
      latestCompletedAt: completedJobs[0]?.completedAt?.toISOString() ?? null,
    };
  }

  async search(
    ownerUserId: string,
    dto: SearchMemoriesDto,
  ): Promise<MemoriesSearchResultDto> {
    await this.assertSearchAllowed(ownerUserId, dto.subjectId);

    const limit = dto.limit ?? DEFAULT_SEARCH_LIMIT;
    const segments = await this.loadCandidateSegments(ownerUserId, dto);
    if (segments.length === 0) {
      return this.noResults();
    }

    const queryEmbedding = await this.buildQueryEmbedding(ownerUserId, dto);
    const embeddingScores = queryEmbedding
      ? await this.scoreEmbeddings(ownerUserId, dto, queryEmbedding)
      : new Map<string, number>();
    const scored = segments
      .map((segment) => this.scoreSegment(segment, dto.q, embeddingScores))
      .filter((segment) => segment.score > 0)
      .sort((a, b) => b.score - a.score || a.startMs - b.startMs)
      .slice(0, limit);

    if (scored.length === 0) {
      return this.noResults();
    }

    const lowConfidence = scored[0].score < LOW_CONFIDENCE_THRESHOLD;
    return {
      status: 'answered',
      answer: composeAnswer(scored, lowConfidence),
      resultCount: scored.length,
      segments: scored,
      lowConfidence,
    };
  }

  private async assertSearchAllowed(
    ownerUserId: string,
    subjectId?: string,
  ): Promise<void> {
    if (!(await this.hasActiveMemoriesEntitlement(ownerUserId))) {
      throw new ForbiddenException({
        code: 'requires_active_entitlement',
        message: 'Paid Memories entitlement is required for memory search.',
      });
    }

    await this.consentsService.assertRequiredConsents(
      ownerUserId,
      ConsentFeature.MEMORIES,
      subjectId,
    );
  }

  private async hasActiveMemoriesEntitlement(ownerUserId: string): Promise<boolean> {
    const entitlements = await this.entitlementsRepository.find({
      where: {
        ownerUserId,
        feature: ProductFeature.MEMORIES,
        status: EntitlementStatus.ACTIVE,
      },
      order: { createdAt: 'DESC' },
    });

    return entitlements.some(
      (entitlement) =>
        !entitlement.endsAt || entitlement.endsAt.getTime() > Date.now(),
    );
  }

  private async loadCandidateSegments(
    ownerUserId: string,
    dto: SearchMemoriesDto,
  ): Promise<MemorySegment[]> {
    return this.memorySegmentsRepository.find({
      where: {
        ownerUserId,
        ...(dto.subjectId ? { subjectId: dto.subjectId } : {}),
        ...(dto.recordingId ? { recordingId: dto.recordingId } : {}),
      },
      order: { updatedAt: 'DESC' },
      take: 200,
    });
  }

  private async buildQueryEmbedding(
    ownerUserId: string,
    dto: SearchMemoriesDto,
  ): Promise<number[] | null> {
    const context: AiProviderConsentContext = {
      ownerUserId,
      subjectId: dto.subjectId,
      feature: ConsentFeature.MEMORIES,
    };
    return this.aiClientService.embed(dto.q, context);
  }

  private async scoreEmbeddings(
    ownerUserId: string,
    dto: SearchMemoriesDto,
    queryEmbedding: readonly number[],
  ): Promise<Map<string, number>> {
    const embeddings = await this.embeddingsRepository.find({
      where: {
        ownerUserId,
        ...(dto.subjectId ? { subjectId: dto.subjectId } : {}),
        ...(dto.recordingId ? { recordingId: dto.recordingId } : {}),
      },
      relations: ['memorySegment'],
      take: 500,
    });
    const scores = new Map<string, number>();

    for (const embedding of embeddings) {
      if (!embedding.memorySegment || embedding.embedding.length === 0) {
        continue;
      }
      const score = cosineSimilarity(queryEmbedding, embedding.embedding);
      const existing = scores.get(embedding.memorySegmentId) ?? 0;
      if (score > existing) {
        scores.set(embedding.memorySegmentId, score);
      }
    }

    return scores;
  }

  private scoreSegment(
    segment: MemorySegment,
    query: string,
    embeddingScores: Map<string, number>,
  ): MemorySearchSegmentDto {
    const keywordScore = scoreText(segment.memoryText, query);
    const vectorScore = embeddingScores.get(segment.id) ?? 0;
    const score = Math.max(keywordScore, vectorScore);

    return {
      id: segment.id,
      recordingId: segment.recordingId,
      subjectId: segment.subjectId,
      startMs: segment.startMs,
      endMs: segment.endMs,
      speakerLabel: segment.speakerLabel,
      text: segment.memoryText,
      score: roundScore(score),
      lowConfidence: score < LOW_CONFIDENCE_THRESHOLD,
    };
  }

  private noResults(): MemoriesSearchResultDto {
    return {
      status: 'no_results',
      answer: 'No indexed Memories matched this question yet.',
      resultCount: 0,
      segments: [],
      lowConfidence: true,
    };
  }
}

function scoreText(text: string, query: string): number {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return 0;
  }
  const haystack = text.toLocaleLowerCase();
  const matches = tokens.filter((token) => haystack.includes(token)).length;
  return matches / tokens.length;
}

function tokenize(value: string): string[] {
  return [
    ...new Set(
      value
        .toLocaleLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2),
    ),
  ];
}

function cosineSimilarity(left: readonly number[], right: readonly number[]): number {
  if (left.length === 0 || left.length !== right.length) {
    return 0;
  }
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] ** 2;
    rightMagnitude += right[index] ** 2;
  }
  const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);
  return denominator === 0 ? 0 : dot / denominator;
}

function roundScore(score: number): number {
  return Math.round(score * 1000) / 1000;
}

function composeAnswer(
  segments: readonly MemorySearchSegmentDto[],
  lowConfidence: boolean,
): string {
  const prefix = lowConfidence
    ? 'I found a weak possible match.'
    : `I found ${segments.length} relevant memory segment${segments.length === 1 ? '' : 's'}.`;
  const highlights = segments
    .slice(0, 3)
    .map((segment) => segment.text)
    .join(' ');
  return `${prefix} ${highlights}`.trim();
}
