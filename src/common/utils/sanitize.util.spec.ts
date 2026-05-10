import { sanitizeForLog } from './sanitize.util';

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
});
