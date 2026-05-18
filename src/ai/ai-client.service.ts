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

export interface AiMemoryExtractRequest {
  history: AiChatHistoryItem[];
  user_message: string;
  assistant_message: string;
}

export interface AiMemoryExtractResponse {
  saved: boolean;
  importance?: number;
  memory_type?: string;
  category?: string;
  summary?: string;
  reason?: string;
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

  async extractMemory(
    request: AiMemoryExtractRequest,
  ): Promise<AiMemoryExtractResponse | null> {
    if (!this.isConfigured()) {
      return null;
    }

    return this.postJson<AiMemoryExtractResponse>('/ai/memory/extract', request);
  }

  async transcribe(file: Express.Multer.File): Promise<string | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const formData = new FormData();
    const audioBytes = file.buffer.buffer.slice(
      file.buffer.byteOffset,
      file.buffer.byteOffset + file.buffer.byteLength,
    ) as ArrayBuffer;
    const blob = new Blob([audioBytes], {
      type: file.mimetype || 'application/octet-stream',
    });
    formData.append('audio_file', blob, file.originalname);

    const response = await this.postForm<{ stt_text?: string; text?: string }>(
      '/ai/stt',
      formData,
    );
    const sttText = response.stt_text ?? response.text;

    if (!sttText || typeof sttText !== 'string') {
      throw new Error('AI STT response is missing text.');
    }

    return sttText;
  }

  async synthesizeSpeech(text: string): Promise<Buffer | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const response = await this.postRaw('/ai/tts', { text });
    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.includes('audio/mpeg')) {
      throw new Error('AI TTS response is not audio/mpeg.');
    }

    return Buffer.from(await response.arrayBuffer());
  }

  private async postJson<TResponse>(
    path: string,
    payload: unknown,
  ): Promise<TResponse> {
    const response = await this.request(path, {
      method: 'POST',
      headers: this.buildJsonHeaders(),
      body: JSON.stringify(payload),
    });

    return (await response.json()) as TResponse;
  }

  private async postForm<TResponse>(
    path: string,
    formData: FormData,
  ): Promise<TResponse> {
    const response = await this.request(path, {
      method: 'POST',
      headers: this.buildAuthHeaders(),
      body: formData,
    });

    return (await response.json()) as TResponse;
  }

  private async postRaw(
    path: string,
    payload: unknown,
  ): Promise<Response> {
    return this.request(path, {
      method: 'POST',
      headers: this.buildJsonHeaders(),
      body: JSON.stringify(payload),
    });
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const baseUrl = this.getBaseUrl();

    if (!baseUrl) {
      throw new Error('AI_SERVER_URL is not configured.');
    }

    const controller = new AbortController();
    const timeoutMs = this.configService.get<number>('AI_SERVER_TIMEOUT_MS') ?? 45000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`AI server returned ${response.status}.`);
      }

      return response;
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

  private buildJsonHeaders(): HeadersInit {
    return {
      ...this.buildAuthHeaders(),
      'content-type': 'application/json',
    };
  }

  private buildAuthHeaders(): HeadersInit {
    const token = this.configService.get<string>('AI_SERVER_TOKEN')?.trim();

    if (!token) {
      return {};
    }

    return {
      'x-ai-server-token': token,
    };
  }

  private getBaseUrl(): string | null {
    const rawUrl = this.configService.get<string>('AI_SERVER_URL')?.trim();

    if (!rawUrl) {
      return null;
    }

    return rawUrl.replace(/\/+$/, '');
  }
}
