import { sanitizeForAuditMetadata, sanitizeForLog } from './sanitize.util';

describe('sanitizeForLog', () => {
  it('redacts sensitive keys recursively', () => {
    const sanitized = sanitizeForLog({
      password: 'secret',
      nested: {
        refreshToken: 'refresh-token',
        safe: 'value',
      },
      items: [{ accessToken: 'token-1' }],
    });

    expect(sanitized).toEqual({
      password: '[REDACTED]',
      nested: {
        refreshToken: '[REDACTED]',
        safe: 'value',
      },
      items: [{ accessToken: '[REDACTED]' }],
    });
  });

  it('redacts transcript audio document and auth log details recursively', () => {
    const sanitized = sanitizeForLog({
      status: 'failed',
      count: 2,
      rawTranscript: '원문 녹취',
      playbackUrl: 'https://r2.example.com/audio.wav?X-Amz-Signature=abc',
      providerSecret: 'sk-provider-secret',
      nested: {
        rawAudioUrl: 'https://cdn.example.com/raw.wav',
        generatedAudioUrl: 'https://cdn.example.com/generated.wav',
        documentText: 'full document contents',
        ocr_text: 'OCR extracted page text',
        tokenHint: 'safe-count-token-label',
      },
      items: [
        {
          raw_transcript: 'nested transcript',
          safeId: 'segment-id',
        },
        'Bearer forbidden-token',
      ],
    });

    expect(sanitized).toEqual({
      status: 'failed',
      count: 2,
      rawTranscript: '[REDACTED]',
      playbackUrl: '[REDACTED]',
      providerSecret: '[REDACTED]',
      nested: {
        rawAudioUrl: '[REDACTED]',
        generatedAudioUrl: '[REDACTED]',
        documentText: '[REDACTED]',
        ocr_text: '[REDACTED]',
        tokenHint: '[REDACTED]',
      },
      items: [
        {
          raw_transcript: '[REDACTED]',
          safeId: 'segment-id',
        },
        '[REDACTED]',
      ],
    });
    expect(JSON.stringify(sanitized)).not.toContain('원문 녹취');
    expect(JSON.stringify(sanitized)).not.toContain('X-Amz-Signature');
    expect(JSON.stringify(sanitized)).not.toContain('raw.wav');
    expect(JSON.stringify(sanitized)).not.toContain('generated.wav');
    expect(JSON.stringify(sanitized)).not.toContain('full document contents');
    expect(JSON.stringify(sanitized)).not.toContain('OCR extracted page text');
    expect(JSON.stringify(sanitized)).not.toContain('forbidden-token');
  });
});

describe('sanitizeForAuditMetadata', () => {
  it('removes forbidden audit keys and values while preserving useful metadata', () => {
    const sanitized = sanitizeForAuditMetadata({
      status: 'archived',
      count: 2,
      playbackUrl: 'https://r2.example.com/audio.wav?X-Amz-Signature=abc',
      nested: {
        rawTranscript: '원문 녹취',
        safeId: 'segment-id',
        tokenHint: 'abc123',
      },
      items: [
        {
          generatedAudioUrl: 'https://cdn.example.com/generated.wav',
          allowedState: 'ready',
        },
        'Bearer forbidden-token',
      ],
    });

    expect(sanitized).toEqual({
      status: 'archived',
      count: 2,
      nested: {
        safeId: 'segment-id',
      },
      items: [
        {
          allowedState: 'ready',
        },
      ],
    });
    expect(JSON.stringify(sanitized)).not.toContain('X-Amz-Signature');
    expect(JSON.stringify(sanitized)).not.toContain('원문 녹취');
    expect(JSON.stringify(sanitized)).not.toContain('forbidden-token');
    expect(JSON.stringify(sanitized)).not.toContain('generated.wav');
  });

  it('removes auth cookie provider secret and persona question metadata', () => {
    const sanitized = sanitizeForAuditMetadata({
      allowedStatus: 'queued',
      requestHeader: 'Cookie: session_id=sensitive-session',
      provider: {
        apiKey: 'sk-provider-secret',
        model: 'voice-preview',
      },
      personaPrompt: 'What should PersonaAI ask next?',
      rawDocumentUrl: 's3://private-bucket/document.pdf',
    });

    expect(sanitized).toEqual({
      allowedStatus: 'queued',
      provider: {
        model: 'voice-preview',
      },
    });
    expect(JSON.stringify(sanitized)).not.toContain('sensitive-session');
    expect(JSON.stringify(sanitized)).not.toContain('sk-provider-secret');
    expect(JSON.stringify(sanitized)).not.toContain('PersonaAI ask next');
    expect(JSON.stringify(sanitized)).not.toContain('private-bucket');
  });

  it('removes snake case forbidden keys and auth-like values', () => {
    const sanitized = sanitizeForAuditMetadata({
      allowedEvent: 'reviewed',
      raw_audio_url: 'https://cdn.example.com/raw.wav',
      generated_audio_url: 'https://cdn.example.com/generated.wav',
      document_text: 'full document contents',
      fullPersonaQuestions: ['What is your earliest memory?'],
      questionText: '어릴 때 가장 좋아한 음식은?',
      user_question: 'What was your first school?',
      nested: {
        safeState: 'masked',
        headerValue: 'Authorization: Bearer header-token',
        cookieValue: 'Cookie: sid=session-token',
        tokenValue: 'token: generated-token',
      },
    });

    expect(sanitized).toEqual({
      allowedEvent: 'reviewed',
      nested: {
        safeState: 'masked',
      },
    });
    expect(JSON.stringify(sanitized)).not.toContain('raw.wav');
    expect(JSON.stringify(sanitized)).not.toContain('generated.wav');
    expect(JSON.stringify(sanitized)).not.toContain('full document contents');
    expect(JSON.stringify(sanitized)).not.toContain('earliest memory');
    expect(JSON.stringify(sanitized)).not.toContain('좋아한 음식');
    expect(JSON.stringify(sanitized)).not.toContain('first school');
    expect(JSON.stringify(sanitized)).not.toContain('header-token');
    expect(JSON.stringify(sanitized)).not.toContain('session-token');
    expect(JSON.stringify(sanitized)).not.toContain('generated-token');
  });
});
