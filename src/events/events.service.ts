import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { sanitizeForAuditMetadata } from '../common/utils/sanitize.util';
import { AppEvent } from './app-event.entity';

export type AppEventInput = {
  readonly userId: string;
  readonly name: string;
  readonly subjectId?: string;
  readonly recordingId?: string;
  readonly orderId?: string;
  readonly payload?: Record<string, unknown>;
};

const MAX_EVENT_STRING_LENGTH = 4096;

@Injectable()
export class AppEventsService {
  constructor(
    @InjectRepository(AppEvent)
    private readonly appEventsRepository: Repository<AppEvent>,
  ) {}

  async emit(input: AppEventInput): Promise<AppEvent | null> {
    try {
      const event = this.appEventsRepository.create({
        userId: input.userId,
        name: input.name,
        subjectId: input.subjectId ?? null,
        recordingId: input.recordingId ?? null,
        orderId: input.orderId ?? null,
        payload: compactEventPayload(sanitizeForAuditMetadata(input.payload)),
      });

      return await this.appEventsRepository.save(event);
    } catch (error) {
      if (error instanceof Error) {
        return null;
      }

      return null;
    }
  }
}

function compactEventPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload)
      .map(([key, value]) => [key, compactEventPayloadValue(value)] as const)
      .filter(([, value]) => value !== undefined),
  );
}

function compactEventPayloadValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.length <= MAX_EVENT_STRING_LENGTH ? value : undefined;
  }

  if (Array.isArray(value)) {
    const compactedValues = value
      .map((item) => compactEventPayloadValue(item))
      .filter((item) => item !== undefined);

    return compactedValues.length > 0 ? compactedValues : undefined;
  }

  if (isRecord(value)) {
    const compactedRecord = compactEventPayload(value);

    return Object.keys(compactedRecord).length > 0 ? compactedRecord : undefined;
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
