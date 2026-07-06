import { ForbiddenException, Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsentFeature } from '../common/enums/consent.enums';
import {
  ConsentsService,
  getRequiredConsentTypes,
} from '../consents/consents.service';
import { DeterministicRedactor } from '../masking/deterministic-redactor';
import {
  ProviderCallGatewayService,
  type ProviderCallOperation,
} from './provider-call-gateway.service';
import type {
  AiAnalysisTranscriptionRequest,
  AiAnalysisTranscriptionResponse,
} from './ai-analysis-transcription.types';
import { AiServerHttpError } from './ai-server-http.error';

export interface AiChatMemory {
  id: string;
  title: string;
  content: string;
  tags?: string[];
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

export interface AiProviderConsentContext {
  readonly ownerUserId: string;
  readonly subjectId?: string;
  readonly feature?: ConsentFeature;
  readonly bypassConsentCheck?: boolean;
}

type RequiredConsentAsserter = Pick<ConsentsService, 'assertRequiredConsents'>;

interface AiEmbedResponse {
  embedding?: number[];
}

@Injectable()
export class AiClientService {
  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(ConsentsService)
    private readonly consentsService?: RequiredConsentAsserter,
    @Optional()
    @Inject(ProviderCallGatewayService)
    private readonly providerCallGateway?: ProviderCallGatewayService,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.getBaseUrl());
  }

  async chat(
    request: AiChatRequest,
    consentContext?: AiProviderConsentContext,
  ): Promise<AiChatResponse | null> {
    if (!this.isConfigured()) {
      return null;
    }
    await this.assertProviderConsents(consentContext, ConsentFeature.MEMORIES);

    const response = await this.postJson<AiChatResponse>(
      '/ai/chat',
      this.prepareProviderPayload('llm_chat', request, true),
    );

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

  async embed(
    text: string,
    consentContext?: AiProviderConsentContext,
  ): Promise<number[] | null> {
    if (!this.isConfigured()) {
      return null;
    }
    await this.assertProviderConsents(consentContext, ConsentFeature.MEMORIES);

    const response = await this.postJson<AiEmbedResponse>(
      '/ai/embed',
      this.prepareProviderPayload('embedding', { text }, true),
    );

    if (!Array.isArray(response.embedding)) {
      throw new Error('AI embed response is missing embedding.');
    }

    return response.embedding;
  }

  async extractMemory(
    request: AiMemoryExtractRequest,
    consentContext?: AiProviderConsentContext,
  ): Promise<AiMemoryExtractResponse | null> {
    if (!this.isConfigured()) {
      return null;
    }
    await this.assertProviderConsents(consentContext, ConsentFeature.MEMORIES);

    return this.postJson<AiMemoryExtractResponse>(
      '/ai/memory/extract',
      this.prepareProviderPayload('memory_extract', request, true),
    );
  }

  async requestAnalysisTranscription(
    request: AiAnalysisTranscriptionRequest,
    consentContext?: AiProviderConsentContext,
  ): Promise<AiAnalysisTranscriptionResponse | null> {
    if (!this.isConfigured()) {
      return null;
    }
    await this.assertProviderConsents(consentContext, ConsentFeature.MEMORIES);

    const response = await this.postJson<AiAnalysisTranscriptionResponse>(
      '/v1/analysis/transcriptions',
      this.prepareProviderPayload('stt', request, false),
    );

    if (!Array.isArray(response.segments)) {
      throw new Error('AI transcription response is missing segments.');
    }

    return response;
  }

  async transcribe(
    file: Express.Multer.File,
    consentContext?: AiProviderConsentContext,
  ): Promise<string | null> {
    if (!this.isConfigured()) {
      return null;
    }
    await this.assertProviderConsents(consentContext, ConsentFeature.MEMORIES);

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

  async synthesizeSpeech(
    text: string,
    consentContext?: AiProviderConsentContext,
  ): Promise<Buffer | null> {
    if (!this.isConfigured()) {
      return null;
    }
    await this.assertProviderConsents(
      consentContext,
      ConsentFeature.VOICE_PERSONA,
    );

    const response = await this.postRaw(
      '/ai/tts',
      this.prepareProviderPayload('voice_synthesis', { text }, true),
    );
    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.includes('audio/mpeg')) {
      throw new Error('AI TTS response is not audio/mpeg.');
    }

    return Buffer.from(await response.arrayBuffer());
  }

  private async assertProviderConsents(
    consentContext: AiProviderConsentContext | undefined,
    fallbackFeature: ConsentFeature,
  ): Promise<void> {
    const feature = consentContext?.feature ?? fallbackFeature;

    if (consentContext?.bypassConsentCheck) {
      return;
    }

    if (!consentContext || !this.consentsService) {
      throw new ForbiddenException({
        code: 'requires_consent',
        message: '외부 Provider 호출에는 필요한 동의가 필요해요.',
        missing_consent_types: getRequiredConsentTypes(feature),
      });
    }

    await this.consentsService.assertRequiredConsents(
      consentContext.ownerUserId,
      feature,
      consentContext.subjectId,
    );
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
        throw await AiServerHttpError.fromResponse(response);
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

  private prepareProviderPayload(
    operation: ProviderCallOperation,
    payload: unknown,
    redactionRequired: boolean,
  ): unknown {
    return this.getProviderCallGateway().prepareJsonPayload({
      operation,
      payload,
      redactionRequired,
    }).payload;
  }

  private getProviderCallGateway(): ProviderCallGatewayService {
    return (
      this.providerCallGateway ??
      new ProviderCallGatewayService(new DeterministicRedactor())
    );
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
