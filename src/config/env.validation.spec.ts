import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const baseConfig = {
    JWT_ACCESS_SECRET: 'access-secret',
    JWT_REFRESH_SECRET: 'refresh-secret',
  };

  it('parses numeric and boolean values', () => {
    const result = validateEnv({
      ...baseConfig,
      PORT: '3100',
      DB_SSL: 'true',
      DB_SYNCHRONIZE: 'false',
      DB_MIGRATIONS_RUN: 'true',
      BOOTSTRAP_SEED: 'true',
    });

    expect(result.PORT).toBe(3100);
    expect(result.DB_SSL).toBe(true);
    expect(result.DB_SYNCHRONIZE).toBe(false);
    expect(result.DB_MIGRATIONS_RUN).toBe(true);
    expect(result.BOOTSTRAP_SEED).toBe(true);
    expect(result.AI_SERVER_TIMEOUT_MS).toBe(45000);
  });

  it('parses optional AI server settings', () => {
    const result = validateEnv({
      ...baseConfig,
      AI_SERVER_URL: 'http://localhost:8000',
      AI_SERVER_TOKEN: 'shared-secret',
      AI_SERVER_TIMEOUT_MS: '2500',
    });

    expect(result.AI_SERVER_URL).toBe('http://localhost:8000');
    expect(result.AI_SERVER_TOKEN).toBe('shared-secret');
    expect(result.AI_SERVER_TIMEOUT_MS).toBe(2500);
  });

  it('accepts R2 audio storage configuration', () => {
    const result = validateEnv({
      ...baseConfig,
      AUDIO_STORAGE_DRIVER: 'r2',
      R2_ACCOUNT_ID: 'account-id',
      R2_BUCKET_NAME: 'talkto-audio',
      R2_ACCESS_KEY_ID: 'access-key',
      R2_SECRET_ACCESS_KEY: 'secret-key',
    });

    expect(result.AUDIO_STORAGE_DRIVER).toBe('r2');
    expect(result.R2_ACCOUNT_ID).toBe('account-id');
    expect(result.R2_BUCKET_NAME).toBe('talkto-audio');
  });

  it('rejects incomplete R2 audio storage configuration', () => {
    expect(() =>
      validateEnv({
        ...baseConfig,
        AUDIO_STORAGE_DRIVER: 'r2',
        R2_BUCKET_NAME: 'talkto-audio',
      }),
    ).toThrow(/R2_ACCOUNT_ID is required/);
  });

  it('rejects unsafe production defaults', () => {
    expect(() =>
      validateEnv({
        ...baseConfig,
        NODE_ENV: 'production',
        DB_SYNCHRONIZE: 'true',
        BOOTSTRAP_SEED: 'true',
        JWT_ACCESS_SECRET: 'change-me-access',
        JWT_REFRESH_SECRET: 'change-me-refresh',
      }),
    ).toThrow(/Environment validation failed/);
  });
});
