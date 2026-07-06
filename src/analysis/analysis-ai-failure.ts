import { AiServerHttpError } from '../ai/ai-server-http.error';

const TRANSIENT_AUDIO_URL_CODES = new Set([
  'AUDIO_URL_EXPIRED',
  'AUDIO_DOWNLOAD_FAILED',
]);

const QUALITY_FAILURE_MESSAGES = {
  EMPTY_TRANSCRIPT: 'PRV-003 음질 부족: 음성 인식 결과가 비어 있습니다.',
  AUDIO_TOO_SHORT: 'PRV-003 길이 부족: 인식된 발화가 너무 짧습니다.',
} as const satisfies Readonly<Record<string, string>>;

export function canRetryWithFreshAudioUrl(error: unknown): boolean {
  return (
    error instanceof AiServerHttpError &&
    error.status === 422 &&
    error.code !== null &&
    TRANSIENT_AUDIO_URL_CODES.has(error.code)
  );
}

export function normalizedAiFailureCode(code: string | null): string {
  if (!code) {
    return 'ai_transcription_failed';
  }
  return code.toLowerCase();
}

export function aiFailureMessage(code: string | null): string {
  return (
    qualityFailureMessage(code) ??
    'AI transcription failed before producing a usable transcript.'
  );
}

function qualityFailureMessage(code: string | null): string | null {
  switch (code) {
    case 'EMPTY_TRANSCRIPT':
      return QUALITY_FAILURE_MESSAGES.EMPTY_TRANSCRIPT;
    case 'AUDIO_TOO_SHORT':
      return QUALITY_FAILURE_MESSAGES.AUDIO_TOO_SHORT;
    default:
      return null;
  }
}
