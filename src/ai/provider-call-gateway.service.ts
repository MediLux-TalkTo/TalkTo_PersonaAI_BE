import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  DeterministicRedactor,
  type DeterministicMaskingSpan,
} from '../masking/deterministic-redactor';
import {
  MaskingStatus,
  type MaskingStatus as MaskingStatusValue,
} from '../masking/masking.constants';

export type ProviderCallOperation =
  | 'llm_chat'
  | 'embedding'
  | 'memory_extract'
  | 'persona_assembly'
  | 'persona_response'
  | 'voice_synthesis'
  | 'stt';

export type ProviderCallGatewayInput = {
  readonly operation: ProviderCallOperation;
  readonly redactionRequired: boolean;
  readonly payload: unknown;
};

export type ProviderCallGatewayMetadata = {
  readonly operation: ProviderCallOperation;
  readonly redactionRequired: boolean;
  readonly redactionStatus: MaskingStatusValue;
  readonly spanCount: number;
  readonly spanCounts: Readonly<Record<string, number>>;
};

export type ProviderCallGatewayResult = {
  readonly payload: unknown;
  readonly metadata: ProviderCallGatewayMetadata;
};

type ProviderCallBlockedResponse = {
  readonly code: 'provider_redaction_failed' | 'provider_payload_forbidden';
  readonly message: string;
  readonly operation: ProviderCallOperation;
  readonly redactionRequired: boolean;
  readonly errorCode?: string;
  readonly blockedDataClasses?: readonly string[];
};

const FORBIDDEN_PROVIDER_KEY_PATTERN =
  /apiKey|authorization|authHeader|cookie|credential|generatedAudioUrl|password|playbackUrl|presigned|providerSecret|rawAudioUrl|rawDocumentUrl|refreshToken|secret|signedUrl|token|uploadUrl/i;
const FORBIDDEN_PROVIDER_VALUE_PATTERN =
  /https?:\/\/\S*(?:X-Amz-Signature|AWSAccessKeyId|signature=|token=)\S*|s3:\/\/\S+|https?:\/\/\S+\.(?:wav|mp3|m4a|aac)(?:\?\S*)?/i;

@Injectable()
export class ProviderCallGatewayService {
  constructor(private readonly redactor: DeterministicRedactor) {}

  prepareJsonPayload(
    input: ProviderCallGatewayInput,
  ): ProviderCallGatewayResult {
    const forbiddenDataClasses = findForbiddenProviderData(
      input.payload,
      input.operation,
    );
    if (forbiddenDataClasses.length > 0) {
      throw new ProviderCallBlockedException({
        code: 'provider_payload_forbidden',
        message: 'Provider payload contains data classes that cannot leave the backend.',
        operation: input.operation,
        redactionRequired: input.redactionRequired,
        blockedDataClasses: [...new Set(forbiddenDataClasses)],
      });
    }

    if (!input.redactionRequired) {
      return {
        payload: input.payload,
        metadata: {
          operation: input.operation,
          redactionRequired: false,
          redactionStatus: MaskingStatus.NOT_REQUIRED,
          spanCount: 0,
          spanCounts: {},
        },
      };
    }

    const redaction = this.redactor.redactPayload(input.payload);
    if (redaction.status === MaskingStatus.FAILED) {
      throw new ProviderCallBlockedException({
        code: 'provider_redaction_failed',
        message: 'Provider call blocked because required redaction failed.',
        operation: input.operation,
        redactionRequired: true,
        errorCode: redaction.errorCode ?? 'redaction_failed',
      });
    }

    return {
      payload: redaction.payload,
      metadata: buildMetadata(input.operation, true, redaction.spans),
    };
  }
}

export class ProviderCallBlockedException extends ForbiddenException {
  constructor(response: ProviderCallBlockedResponse) {
    super(response);
  }
}

function buildMetadata(
  operation: ProviderCallOperation,
  redactionRequired: boolean,
  spans: readonly DeterministicMaskingSpan[],
): ProviderCallGatewayMetadata {
  return {
    operation,
    redactionRequired,
    redactionStatus: MaskingStatus.SUCCEEDED,
    spanCount: spans.length,
    spanCounts: countSpans(spans),
  };
}

function countSpans(
  spans: readonly DeterministicMaskingSpan[],
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const span of spans) {
    counts[span.kind] = (counts[span.kind] ?? 0) + 1;
  }
  return counts;
}

function findForbiddenProviderData(
  payload: unknown,
  operation: ProviderCallOperation,
): readonly string[] {
  const matches: string[] = [];
  collectForbiddenProviderData(payload, matches, operation);
  return matches;
}

function collectForbiddenProviderData(
  payload: unknown,
  matches: string[],
  operation: ProviderCallOperation,
  parentKey?: string,
): void {
  if (typeof payload === 'string') {
    if (
      !isAllowedSttAudioUrl(operation, parentKey) &&
      FORBIDDEN_PROVIDER_VALUE_PATTERN.test(payload)
    ) {
      matches.push('presigned_or_raw_audio_url');
    }
    return;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      collectForbiddenProviderData(item, matches, operation, parentKey);
    }
    return;
  }

  if (!isRecord(payload)) {
    return;
  }

  for (const [key, value] of Object.entries(payload)) {
    if (FORBIDDEN_PROVIDER_KEY_PATTERN.test(key)) {
      matches.push(providerDataClassForKey(key));
      continue;
    }
    collectForbiddenProviderData(value, matches, operation, key);
  }
}

function isAllowedSttAudioUrl(
  operation: ProviderCallOperation,
  key?: string,
): boolean {
  return operation === 'stt' && key === 'audioUrl';
}

function providerDataClassForKey(key: string): string {
  if (/rawAudioUrl|generatedAudioUrl/i.test(key)) {
    return 'raw_audio_url';
  }
  if (/presigned|signedUrl|playbackUrl|uploadUrl/i.test(key)) {
    return 'presigned_url';
  }
  if (/apiKey|authorization|authHeader|cookie|credential|password|providerSecret|refreshToken|secret|token/i.test(key)) {
    return 'provider_secret';
  }
  return 'forbidden_provider_payload';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
