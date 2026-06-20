const SENSITIVE_KEY_PATTERN =
  /password|passwordHash|refreshToken|accessToken|authorization|apiKey|authHeader|cookie|credential|secret|token/i;
const SENSITIVE_LOG_NORMALIZED_KEYS = new Set([
  'audiofileurl',
  'audiourl',
  'documentcontent',
  'documenttext',
  'documenturl',
  'generatedaudiofileurl',
  'generatedaudiourl',
  'ocrcontent',
  'ocrtext',
  'playbackurl',
  'presignedurl',
  'providersecret',
  'rawaudiofileurl',
  'rawaudiourl',
  'rawdocumentcontent',
  'rawdocumenttext',
  'rawdocumenturl',
  'rawtranscript',
  'signedurl',
  'transcript',
  'transcripttext',
]);
const SENSITIVE_LOG_VALUE_PATTERN =
  /authorization:\s*\S+|bearer\s+\S+|cookie:\s*\S+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|(?:^|[?&;\s])(?:x-amz-signature|awsaccesskeyid|signature|token)=|https?:\/\/\S+\.(?:aac|flac|m4a|mp3|ogg|opus|wav)(?:[?#]\S*)?|s3:\/\/\S+/i;
const AUDIT_FORBIDDEN_KEY_PATTERN =
  /apiKey|authorization|authHeader|cookie|credential|documentContent|documentText|documentUrl|fullQuestion|generatedAudioUrl|ocrText|password|personaPrompt|personaQuestion|playbackUrl|presigned|providerSecret|questionText|rawAudioUrl|rawDocumentUrl|rawQuestion|rawTranscript|refreshToken|secret|signedUrl|token|transcript|uploadUrl|userQuestion/i;
const AUDIT_FORBIDDEN_NORMALIZED_KEYS = new Set([
  'apikey',
  'authorization',
  'authheader',
  'cookie',
  'credential',
  'documentcontent',
  'documenttext',
  'documenturl',
  'fullpersonaquestions',
  'fullquestion',
  'generatedaudiourl',
  'ocrtext',
  'password',
  'personaprompt',
  'personaquestion',
  'playbackurl',
  'presigned',
  'providersecret',
  'questiontext',
  'rawaudiourl',
  'rawdocumenturl',
  'rawquestion',
  'rawtranscript',
  'refreshtoken',
  'secret',
  'signedurl',
  'token',
  'transcript',
  'uploadurl',
  'userquestion',
]);
const AUDIT_FORBIDDEN_VALUE_PATTERN =
  /https?:\/\/\S+|s3:\/\/\S+|authorization:\s*\S+|bearer\s+\S+|cookie:\s*\S+|token\s*[:=]\s*\S+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|(?:x-amz-signature|awsaccesskeyid|signature|token)=/i;

export function sanitizeForLog(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (isSensitiveLogKey(key)) {
          return [key, '[REDACTED]'];
        }

        return [key, sanitizeForLog(nestedValue)];
      }),
    );
  }

  if (typeof value === 'string' && SENSITIVE_LOG_VALUE_PATTERN.test(value)) {
    return '[REDACTED]';
  }

  return value;
}

export function sanitizeForAuditMetadata(
  value: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const sanitized = sanitizeAuditValue(value ?? {});

  if (isRecord(sanitized)) {
    return sanitized;
  }

  return {};
}

function sanitizeAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeAuditValue(item))
      .filter((item) => item !== undefined);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (isRecord(value)) {
    const entries = Object.entries(value)
      .map(([key, nestedValue]) => {
        if (isForbiddenAuditMetadataKey(key)) {
          return undefined;
        }

        const sanitizedValue = sanitizeAuditValue(nestedValue);

        if (sanitizedValue === undefined) {
          return undefined;
        }

        return [key, sanitizedValue] as const;
      })
      .filter((entry) => entry !== undefined);

    return Object.fromEntries(entries);
  }

  if (typeof value === 'string' && AUDIT_FORBIDDEN_VALUE_PATTERN.test(value)) {
    return undefined;
  }

  return value;
}

function isForbiddenAuditMetadataKey(key: string): boolean {
  if (AUDIT_FORBIDDEN_KEY_PATTERN.test(key)) {
    return true;
  }

  return AUDIT_FORBIDDEN_NORMALIZED_KEYS.has(normalizeAuditMetadataKey(key));
}

function isSensitiveLogKey(key: string): boolean {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return true;
  }

  return SENSITIVE_LOG_NORMALIZED_KEYS.has(normalizeSanitizeKey(key));
}

function normalizeAuditMetadataKey(key: string): string {
  return normalizeSanitizeKey(key);
}

function normalizeSanitizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
