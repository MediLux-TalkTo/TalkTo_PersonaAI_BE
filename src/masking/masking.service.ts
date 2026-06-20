import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeterministicRedactor } from './deterministic-redactor';
import { MaskingSpan } from './masking-span.entity';
import {
  MaskingStatus,
  type RedactionSourceType,
} from './masking.constants';
import { TranscriptRedaction } from './transcript-redaction.entity';

export type RedactTranscriptInput = {
  readonly ownerUserId: string;
  readonly subjectId: string;
  readonly recordingId?: string;
  readonly analysisJobId?: string;
  readonly sourceType: RedactionSourceType;
  readonly sourceId: string;
  readonly rawText: string;
};

type RedactionsRepositoryWriter = {
  create(value: Partial<TranscriptRedaction>): TranscriptRedaction;
  save(value: TranscriptRedaction): Promise<TranscriptRedaction>;
};

type SpansRepositoryWriter = {
  create(value: Partial<MaskingSpan>): MaskingSpan;
  save(value: MaskingSpan[]): Promise<MaskingSpan[]>;
};

@Injectable()
export class MaskingService {
  constructor(
    @InjectRepository(TranscriptRedaction)
    private readonly redactionsRepository: RedactionsRepositoryWriter,
    @InjectRepository(MaskingSpan)
    private readonly spansRepository: SpansRepositoryWriter,
    private readonly redactor: DeterministicRedactor,
  ) {}

  async redactTranscript(
    input: RedactTranscriptInput,
  ): Promise<TranscriptRedaction> {
    const redaction = this.redactor.redactText(input.rawText);
    const transcriptRedaction = this.redactionsRepository.create({
      ownerUserId: input.ownerUserId,
      subjectId: input.subjectId,
      recordingId: input.recordingId ?? null,
      analysisJobId: input.analysisJobId ?? null,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      status: redaction.status,
      redactedText: redaction.redactedText,
      spanCount: redaction.spans.length,
      errorCode: redaction.errorCode ?? null,
    });
    const savedRedaction =
      await this.redactionsRepository.save(transcriptRedaction);

    if (redaction.status !== MaskingStatus.SUCCEEDED) {
      return savedRedaction;
    }

    const spanEntities = redaction.spans.map((span) =>
      this.spansRepository.create({
        redactionId: savedRedaction.id,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        kind: span.kind,
        startOffset: span.startOffset,
        endOffset: span.endOffset,
        replacement: span.replacement,
        confidence: span.confidence,
      }),
    );

    if (spanEntities.length > 0) {
      await this.spansRepository.save(spanEntities);
    }

    return savedRedaction;
  }
}
