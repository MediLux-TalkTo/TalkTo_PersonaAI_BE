enum NodeEnvironment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
}

type EnvSource = Record<string, unknown>;

export interface RuntimeEnv {
  PORT: number;
  NODE_ENV: NodeEnvironment;
  CORS_ORIGINS?: string;
  THROTTLE_TTL: number;
  THROTTLE_LIMIT: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  DB_SYNCHRONIZE: boolean;
  DB_MIGRATIONS_RUN: boolean;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  AI_SERVER_URL?: string;
  AI_SERVER_TIMEOUT_MS: number;
  ADMIN_NAME: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  BOOTSTRAP_SEED: boolean;
}

export function validateEnv(config: EnvSource): RuntimeEnv {
  const errors: string[] = [];

  const environment = readEnum(
    config,
    'NODE_ENV',
    Object.values(NodeEnvironment),
    NodeEnvironment.DEVELOPMENT,
    errors,
  ) as NodeEnvironment;

  const validatedEnv: RuntimeEnv = {
    PORT: readNumber(config, 'PORT', 3000, errors, { min: 1, max: 65535 }),
    NODE_ENV: environment,
    CORS_ORIGINS: readOptionalString(config, 'CORS_ORIGINS'),
    THROTTLE_TTL: readNumber(config, 'THROTTLE_TTL', 60000, errors, {
      min: 1000,
    }),
    THROTTLE_LIMIT: readNumber(config, 'THROTTLE_LIMIT', 60, errors, {
      min: 1,
    }),
    DB_HOST: readString(config, 'DB_HOST', 'localhost', errors),
    DB_PORT: readNumber(config, 'DB_PORT', 5432, errors, {
      min: 1,
      max: 65535,
    }),
    DB_USERNAME: readString(config, 'DB_USERNAME', 'postgres', errors),
    DB_PASSWORD: readString(config, 'DB_PASSWORD', 'postgres', errors),
    DB_NAME: readString(config, 'DB_NAME', 'talkto_persona_ai', errors),
    DB_SYNCHRONIZE: readBoolean(config, 'DB_SYNCHRONIZE', true, errors),
    DB_MIGRATIONS_RUN: readBoolean(
      config,
      'DB_MIGRATIONS_RUN',
      false,
      errors,
    ),
    JWT_ACCESS_SECRET: readString(config, 'JWT_ACCESS_SECRET', undefined, errors),
    JWT_REFRESH_SECRET: readString(
      config,
      'JWT_REFRESH_SECRET',
      undefined,
      errors,
    ),
    JWT_ACCESS_EXPIRES_IN: readString(
      config,
      'JWT_ACCESS_EXPIRES_IN',
      '1h',
      errors,
    ),
    JWT_REFRESH_EXPIRES_IN: readString(
      config,
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
      errors,
    ),
    AI_SERVER_URL: readOptionalString(config, 'AI_SERVER_URL'),
    AI_SERVER_TIMEOUT_MS: readNumber(
      config,
      'AI_SERVER_TIMEOUT_MS',
      10000,
      errors,
      { min: 1000 },
    ),
    ADMIN_NAME: readString(config, 'ADMIN_NAME', 'Local Admin', errors),
    ADMIN_EMAIL: readString(config, 'ADMIN_EMAIL', 'admin@talkto.local', errors),
    ADMIN_PASSWORD: readString(
      config,
      'ADMIN_PASSWORD',
      'Admin1234!',
      errors,
    ),
    BOOTSTRAP_SEED: readBoolean(config, 'BOOTSTRAP_SEED', false, errors),
  };

  if (validatedEnv.NODE_ENV === NodeEnvironment.PRODUCTION) {
    if (validatedEnv.DB_SYNCHRONIZE) {
      errors.push('DB_SYNCHRONIZE must be false in production.');
    }
    if (validatedEnv.BOOTSTRAP_SEED) {
      errors.push('BOOTSTRAP_SEED must be false in production.');
    }
    if (validatedEnv.JWT_ACCESS_SECRET === 'change-me-access') {
      errors.push('JWT_ACCESS_SECRET must not use the default placeholder in production.');
    }
    if (validatedEnv.JWT_REFRESH_SECRET === 'change-me-refresh') {
      errors.push(
        'JWT_REFRESH_SECRET must not use the default placeholder in production.',
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n- ${errors.join('\n- ')}`);
  }

  return validatedEnv;
}

function readString(
  config: EnvSource,
  key: string,
  defaultValue: string | undefined,
  errors: string[],
): string {
  const value = config[key];

  if (value === undefined || value === null || value === '') {
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    errors.push(`${key} is required.`);
    return '';
  }

  if (typeof value !== 'string') {
    errors.push(`${key} must be a string.`);
    return '';
  }

  return value;
}

function readOptionalString(config: EnvSource, key: string): string | undefined {
  const value = config[key];

  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return String(value);
}

function readNumber(
  config: EnvSource,
  key: string,
  defaultValue: number,
  errors: string[],
  options: { min?: number; max?: number } = {},
): number {
  const rawValue = config[key];
  const value = rawValue === undefined || rawValue === '' ? defaultValue : Number(rawValue);

  if (Number.isNaN(value)) {
    errors.push(`${key} must be a valid number.`);
    return defaultValue;
  }

  if (options.min !== undefined && value < options.min) {
    errors.push(`${key} must be greater than or equal to ${options.min}.`);
  }

  if (options.max !== undefined && value > options.max) {
    errors.push(`${key} must be less than or equal to ${options.max}.`);
  }

  return value;
}

function readBoolean(
  config: EnvSource,
  key: string,
  defaultValue: boolean,
  errors: string[],
): boolean {
  const rawValue = config[key];

  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return defaultValue;
  }

  if (typeof rawValue === 'boolean') {
    return rawValue;
  }

  if (typeof rawValue === 'string') {
    if (rawValue === 'true') {
      return true;
    }
    if (rawValue === 'false') {
      return false;
    }
  }

  errors.push(`${key} must be either "true" or "false".`);
  return defaultValue;
}

function readEnum(
  config: EnvSource,
  key: string,
  allowedValues: string[],
  defaultValue: string,
  errors: string[],
): string {
  const value = readString(config, key, defaultValue, errors);

  if (!allowedValues.includes(value)) {
    errors.push(`${key} must be one of: ${allowedValues.join(', ')}.`);
  }

  return value;
}
