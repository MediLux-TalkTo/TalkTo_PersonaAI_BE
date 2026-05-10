const SENSITIVE_KEY_PATTERN =
  /password|passwordHash|refreshToken|accessToken|authorization|secret|token/i;

export function sanitizeForLog(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => {
        if (SENSITIVE_KEY_PATTERN.test(key)) {
          return [key, '[REDACTED]'];
        }

        return [key, sanitizeForLog(nestedValue)];
      }),
    );
  }

  return value;
}
