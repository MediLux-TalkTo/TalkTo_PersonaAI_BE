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
      DB_SYNCHRONIZE: 'false',
      DB_MIGRATIONS_RUN: 'true',
      BOOTSTRAP_SEED: 'true',
    });

    expect(result.PORT).toBe(3100);
    expect(result.DB_SYNCHRONIZE).toBe(false);
    expect(result.DB_MIGRATIONS_RUN).toBe(true);
    expect(result.BOOTSTRAP_SEED).toBe(true);
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
