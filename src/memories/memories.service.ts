import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { AdminService } from '../admin/admin.service';
import { AiClientService } from '../ai/ai-client.service';
import {
  SystemLogCategory,
  SystemLogSeverity,
} from '../common/enums/log.enum';
import { MemoryRevisionAction, MemoryStatus } from '../common/enums/memory.enums';
import { CreateMemoryDto } from './dto/create-memory.dto';
import { QueryMemoriesDto } from './dto/query-memories.dto';
import { UpdateMemoryDto } from './dto/update-memory.dto';
import { MemoryEmbedding } from './memory-embedding.entity';
import { MemoryRevision } from './memory-revision.entity';
import { Memory } from './memory.entity';

@Injectable()
export class MemoriesService {
  constructor(
    @InjectRepository(Memory)
    private readonly memoriesRepository: Repository<Memory>,
    @InjectRepository(MemoryRevision)
    private readonly revisionsRepository: Repository<MemoryRevision>,
    @InjectRepository(MemoryEmbedding)
    private readonly embeddingsRepository: Repository<MemoryEmbedding>,
    private readonly aiClientService: AiClientService,
    private readonly adminService: AdminService,
  ) {}

  async list(query: QueryMemoriesDto): Promise<Memory[]> {
    const status = query.status ?? MemoryStatus.ACTIVE;
    const where: Array<Record<string, unknown>> = [];

    if (query.q) {
      where.push(
        { status, title: ILike(`%${query.q}%`) },
        { status, bodyMarkdown: ILike(`%${query.q}%`) },
      );
    } else {
      where.push({ status });
    }

    if (query.type) {
      where.forEach((item) => {
        item.memoryType = query.type;
      });
    }

    if (query.person) {
      where.forEach((item) => {
        item.relatedPeople = ILike(`%${query.person}%`);
      });
    }

    return this.memoriesRepository.find({
      where,
      order: { updatedAt: 'DESC' },
    });
  }

  async getById(memoryId: string): Promise<Memory> {
    const memory = await this.memoriesRepository.findOne({
      where: { id: memoryId },
      relations: ['revisions', 'embeddings'],
    });

    if (!memory) {
      throw new NotFoundException('Memory not found.');
    }

    return memory;
  }

  async create(userId: string, dto: CreateMemoryDto): Promise<Memory> {
    const memory = this.memoriesRepository.create({
      title: dto.title,
      memoryType: dto.memoryType,
      relatedPeople: dto.relatedPeople ?? [],
      relatedPeriod: dto.relatedPeriod ?? null,
      bodyMarkdown: dto.bodyMarkdown,
      tags: dto.tags ?? [],
      confidenceScore: dto.confidenceScore ?? 0.5,
      status: MemoryStatus.ACTIVE,
      createdBy: userId,
      updatedBy: userId,
    });

    const saved = await this.memoriesRepository.save(memory);

    await this.recordRevision(saved, MemoryRevisionAction.CREATE, null, saved, userId);
    await this.rebuildEmbeddings(saved);

    return this.getById(saved.id);
  }

  async update(userId: string, memoryId: string, dto: UpdateMemoryDto): Promise<Memory> {
    const memory = await this.getById(memoryId);
    const beforeSnapshot = { ...memory };

    Object.assign(memory, {
      ...dto,
      updatedBy: userId,
    });

    const saved = await this.memoriesRepository.save(memory);
    await this.recordRevision(
      saved,
      MemoryRevisionAction.UPDATE,
      beforeSnapshot,
      saved,
      userId,
    );
    await this.rebuildEmbeddings(saved);

    return this.getById(saved.id);
  }

  async deactivate(userId: string, memoryId: string): Promise<Memory> {
    const memory = await this.getById(memoryId);
    const beforeSnapshot = { ...memory };
    memory.status = MemoryStatus.INACTIVE;
    memory.updatedBy = userId;
    const saved = await this.memoriesRepository.save(memory);

    await this.recordRevision(
      saved,
      MemoryRevisionAction.DEACTIVATE,
      beforeSnapshot,
      saved,
      userId,
    );

    return saved;
  }

  async requestReembed(userId: string, memoryId: string): Promise<Memory> {
    const memory = await this.getById(memoryId);
    await this.rebuildEmbeddings(memory);
    await this.recordRevision(
      memory,
      MemoryRevisionAction.REEMBED_REQUESTED,
      null,
      { memoryId: memory.id },
      userId,
      'manual re-embedding request',
    );
    return this.getById(memory.id);
  }

  private async rebuildEmbeddings(memory: Memory) {
    await this.embeddingsRepository.delete({ memoryId: memory.id });
    const chunks = this.chunkMarkdown(memory.bodyMarkdown);
    if (chunks.length === 0) {
      return;
    }

    const embeddings: MemoryEmbedding[] = [];

    for (const [chunkIndex, chunkText] of chunks.entries()) {
      let embedding: number[] | null = null;

      try {
        embedding = await this.aiClientService.embed(chunkText);
      } catch (error) {
        await this.adminService.recordLog({
          category: SystemLogCategory.MEMORY,
          severity: SystemLogSeverity.ERROR,
          detail: {
            reason: 'memory_embedding_failed',
            memoryId: memory.id,
            chunkIndex,
            error: error instanceof Error ? error.message : 'unknown',
          },
        });
      }

      embeddings.push(
        this.embeddingsRepository.create({
          memoryId: memory.id,
          chunkIndex,
          chunkText,
          embedding,
        }),
      );
    }

    await this.embeddingsRepository.save(embeddings);
  }

  private chunkMarkdown(markdown: string): string[] {
    return markdown
      .split(/\n{2,}/)
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  private async recordRevision(
    memory: Memory,
    action: MemoryRevisionAction,
    beforeSnapshot: unknown,
    afterSnapshot: unknown,
    actorUserId: string,
    reason?: string,
  ) {
    const revision = this.revisionsRepository.create({
      memoryId: memory.id,
      action,
      beforeSnapshot: beforeSnapshot ? JSON.parse(JSON.stringify(beforeSnapshot)) : null,
      afterSnapshot: afterSnapshot ? JSON.parse(JSON.stringify(afterSnapshot)) : null,
      actorUserId,
      reason: reason ?? null,
    });

    await this.revisionsRepository.save(revision);
  }
}
