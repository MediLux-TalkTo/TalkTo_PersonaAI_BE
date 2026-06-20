import { Injectable } from '@nestjs/common';
import { MaskingSpanKind, MaskingStatus } from './masking.constants';

export { MaskingSpanKind, MaskingStatus } from './masking.constants';

export type DeterministicMaskingSpan = {
  readonly kind: MaskingSpanKind;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly replacement: string;
  readonly confidence: number;
};

export type RedactedTextResult = {
  readonly status: MaskingStatus;
  readonly redactedText: string | null;
  readonly spans: readonly DeterministicMaskingSpan[];
  readonly errorCode?: string;
};

export type RedactedPayloadResult = {
  readonly status: MaskingStatus;
  readonly payload: unknown;
  readonly spans: readonly DeterministicMaskingSpan[];
  readonly errorCode?: string;
};

type RedactionPattern = {
  readonly kind: MaskingSpanKind;
  readonly replacement: string;
  readonly regex: RegExp;
  readonly confidence: number;
};

type RedactionMatch = DeterministicMaskingSpan;

const REDACTION_PATTERNS: readonly RedactionPattern[] = [
  {
    kind: MaskingSpanKind.NATIONAL_ID,
    replacement: '[NATIONAL_ID]',
    regex: /\b\d{6}-[1-4]\d{6}\b/g,
    confidence: 0.98,
  },
  {
    kind: MaskingSpanKind.EMAIL,
    replacement: '[EMAIL]',
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    confidence: 0.98,
  },
  {
    kind: MaskingSpanKind.PHONE,
    replacement: '[PHONE]',
    regex: /\b(?:\+?82[-\s]?)?0?1[016789][-\s]?\d{3,4}[-\s]?\d{4}\b/g,
    confidence: 0.95,
  },
  {
    kind: MaskingSpanKind.TOKEN,
    replacement: '[TOKEN]',
    regex:
      /\b(?:bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/gi,
    confidence: 0.95,
  },
  {
    kind: MaskingSpanKind.SIGNED_URL,
    replacement: '[SIGNED_URL]',
    regex:
      /https?:\/\/\S*(?:X-Amz-Signature|AWSAccessKeyId|signature=|token=)\S*/gi,
    confidence: 0.97,
  },
  {
    kind: MaskingSpanKind.PROMPT_INJECTION,
    replacement: '[UNTRUSTED_INSTRUCTION]',
    regex: /\b(?:ignore|disregard)\s+(?:all\s+)?(?:previous|prior|above)\s+instructions\b/gi,
    confidence: 0.8,
  },
] as const;

@Injectable()
export class DeterministicRedactor {
  redactText(text: string): RedactedTextResult {
    if (hasMalformedText(text)) {
      return {
        status: MaskingStatus.FAILED,
        redactedText: null,
        spans: [],
        errorCode: 'malformed_text',
      };
    }

    const spans = collectSpans(text);
    if (spans.length === 0) {
      return {
        status: MaskingStatus.SUCCEEDED,
        redactedText: text,
        spans: [],
      };
    }

    return {
      status: MaskingStatus.SUCCEEDED,
      redactedText: applySpans(text, spans),
      spans,
    };
  }

  redactPayload(payload: unknown): RedactedPayloadResult {
    const spans: DeterministicMaskingSpan[] = [];
    const redacted = redactPayloadValue(payload, spans);

    if (redacted.status === MaskingStatus.FAILED) {
      return {
        status: MaskingStatus.FAILED,
        payload: null,
        spans: [],
        errorCode: redacted.errorCode,
      };
    }

    return {
      status: MaskingStatus.SUCCEEDED,
      payload: redacted.value,
      spans,
    };
  }
}

function redactPayloadValue(
  value: unknown,
  spans: DeterministicMaskingSpan[],
): { readonly status: MaskingStatus; readonly value?: unknown; readonly errorCode?: string } {
  if (typeof value === 'string') {
    const redactor = new DeterministicRedactor();
    const result = redactor.redactText(value);
    if (result.status === MaskingStatus.FAILED) {
      return { status: MaskingStatus.FAILED, errorCode: result.errorCode };
    }
    spans.push(...result.spans);
    return { status: MaskingStatus.SUCCEEDED, value: result.redactedText };
  }

  if (Array.isArray(value)) {
    const items: unknown[] = [];
    for (const item of value) {
      const redacted = redactPayloadValue(item, spans);
      if (redacted.status === MaskingStatus.FAILED) {
        return redacted;
      }
      items.push(redacted.value);
    }
    return { status: MaskingStatus.SUCCEEDED, value: items };
  }

  if (isRecord(value)) {
    const entries: [string, unknown][] = [];
    for (const [key, nestedValue] of Object.entries(value)) {
      const redacted = redactPayloadValue(nestedValue, spans);
      if (redacted.status === MaskingStatus.FAILED) {
        return redacted;
      }
      entries.push([key, redacted.value]);
    }
    return { status: MaskingStatus.SUCCEEDED, value: Object.fromEntries(entries) };
  }

  return { status: MaskingStatus.SUCCEEDED, value };
}

function collectSpans(text: string): readonly RedactionMatch[] {
  const matches = REDACTION_PATTERNS.flatMap((pattern) =>
    Array.from(text.matchAll(pattern.regex)).map((match) => ({
      kind: pattern.kind,
      startOffset: match.index ?? 0,
      endOffset: (match.index ?? 0) + match[0].length,
      replacement: pattern.replacement,
      confidence: pattern.confidence,
    })),
  );
  const sorted = [...matches].sort(
    (left, right) => left.startOffset - right.startOffset || right.endOffset - left.endOffset,
  );
  const selected: RedactionMatch[] = [];
  let cursor = 0;

  for (const match of sorted) {
    if (match.startOffset < cursor) {
      continue;
    }
    selected.push(match);
    cursor = match.endOffset;
  }

  return selected;
}

function applySpans(text: string, spans: readonly RedactionMatch[]): string {
  let cursor = 0;
  const chunks: string[] = [];

  for (const span of spans) {
    chunks.push(text.slice(cursor, span.startOffset));
    chunks.push(span.replacement);
    cursor = span.endOffset;
  }

  chunks.push(text.slice(cursor));
  return chunks.join('');
}

function hasMalformedText(text: string): boolean {
  if (text.includes('\u0000')) {
    return true;
  }

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (Number.isNaN(next) || next < 0xdc00 || next > 0xdfff) {
        return true;
      }
    }
    if (code >= 0xdc00 && code <= 0xdfff) {
      const previous = text.charCodeAt(index - 1);
      if (Number.isNaN(previous) || previous < 0xd800 || previous > 0xdbff) {
        return true;
      }
    }
  }

  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
