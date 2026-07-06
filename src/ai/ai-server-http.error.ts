export class AiServerHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    readonly details: unknown,
  ) {
    super(code ? `AI server returned ${status}: ${code}.` : `AI server returned ${status}.`);
  }

  static async fromResponse(response: Response): Promise<AiServerHttpError> {
    const details = await readErrorDetails(response);
    return new AiServerHttpError(response.status, extractProviderErrorCode(details), details);
  }
}

async function readErrorDetails(response: Response): Promise<unknown> {
  const body = await response.text();
  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return body;
    }
    throw error;
  }
}

function extractProviderErrorCode(details: unknown): string | null {
  if (!isRecord(details)) {
    return null;
  }

  const code = details.code ?? details.errorCode;
  return typeof code === 'string' ? code : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
