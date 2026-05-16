import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AiChatMemory {
  id: string;
  title: string;
  content: string;
}

export interface AiChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatRequest {
  message: string;
  history: AiChatHistoryItem[];
  memories: AiChatMemory[];
}

export interface AiChatResponse {
  content: string;
  retrieved_memory_ids?: string[];
  latency_ms?: number;
}

interface AiEmbedResponse {
  embedding?: number[];
}

@Injectable()
export class AiClientService {
  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.getBaseUrl());
  }

  async chat(request: AiChatRequest): Promise<AiChatResponse | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const response = await this.postJson<AiChatResponse>('/ai/chat', request);

    if (!response.content || typeof response.content !== 'string') {
      throw new Error('AI chat response is missing content.');
    }

    return {
      content: response.content,
      retrieved_memory_ids: Array.isArray(response.retrieved_memory_ids)
        ? response.retrieved_memory_ids
        : [],
      latency_ms:
        typeof response.latency_ms === 'number' ? response.latency_ms : undefined,
    };
  }

  async embed(text: string): Promise<number[] | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const response = await this.postJson<AiEmbedResponse>('/ai/embed', { text });

    if (!Array.isArray(response.embedding)) {
      throw new Error('AI embed response is missing embedding.');
    }

    return response.embedding;
  }

  private async postJson<TResponse>(
    path: string,
    payload: unknown,
  ): Promise<TResponse> {
    const baseUrl = this.getBaseUrl();

    if (!baseUrl) {
      throw new Error('AI_SERVER_URL is not configured.');
    }

    const controller = new AbortController();
    const timeoutMs = this.configService.get<number>('AI_SERVER_TIMEOUT_MS') ?? 10000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`AI server returned ${response.status}.`);
      }

      return (await response.json()) as TResponse;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new Error(
          `AI server request timed out after ${timeoutMs}ms.`,
        ) as Error & { cause?: unknown };
        timeoutError.cause = error;
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private getBaseUrl(): string | null {
    const rawUrl = this.configService.get<string>('AI_SERVER_URL')?.trim();

    if (!rawUrl) {
      return null;
    }

    return rawUrl.replace(/\/+$/, '');
  }
}
