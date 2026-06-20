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
  DB_SSL: boolean;
  DB_SYNCHRONIZE: boolean;
  DB_MIGRATIONS_RUN: boolean;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  AI_SERVER_URL?: string;
  AI_SERVER_TOKEN?: string;
  AI_SERVER_TIMEOUT_MS: number;
  AUDIO_STORAGE_DRIVER: string;
  LOCAL_AUDIO_STORAGE_DIR: string;
  LOCAL_AUDIO_PUBLIC_PATH: string;
  AUDIO_SIGNED_URL_TTL_SECONDS: number;
  R2_ACCOUNT_ID?: string;
  R2_BUCKET_NAME?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  ADMIN_NAME: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  BOOTSTRAP_SEED: boolean;
  FREE_ARCHIVE_AI_SUMMARY_ENABLED: boolean;
  FREE_PREVIEW_ANALYSIS_ENABLED: boolean;
  S10_PREVIEW_SCREEN_ENABLED: boolean;
  GENERATED_VOICE_DOWNLOAD_ENABLED: boolean;
  PAYMENT_PROVIDER: string;
  PAYMENT_WEBHOOK_SECRET: string;
  PAYMENT_WEBHOOK_TOLERANCE_SECONDS: number;
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
    DB_SSL: readBoolean(config, 'DB_SSL', false, errors),
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
    AI_SERVER_TOKEN: readOptionalString(config, 'AI_SERVER_TOKEN'),
    AI_SERVER_TIMEOUT_MS: readNumber(
      config,
      'AI_SERVER_TIMEOUT_MS',
      45000,
      errors,
      { min: 1000 },
    ),
    AUDIO_STORAGE_DRIVER: readEnum(
      config,
      'AUDIO_STORAGE_DRIVER',
      ['local', 'r2'],
      'local',
      errors,
    ),
    LOCAL_AUDIO_STORAGE_DIR: readString(
      config,
      'LOCAL_AUDIO_STORAGE_DIR',
      'storage/audio',
      errors,
    ),
    LOCAL_AUDIO_PUBLIC_PATH: readString(
      config,
      'LOCAL_AUDIO_PUBLIC_PATH',
      '/audio',
      errors,
    ),
    AUDIO_SIGNED_URL_TTL_SECONDS: readNumber(
      config,
      'AUDIO_SIGNED_URL_TTL_SECONDS',
      3600,
      errors,
      { min: 60 },
    ),
    R2_ACCOUNT_ID: readOptionalString(config, 'R2_ACCOUNT_ID'),
    R2_BUCKET_NAME: readOptionalString(config, 'R2_BUCKET_NAME'),
    R2_ACCESS_KEY_ID: readOptionalString(config, 'R2_ACCESS_KEY_ID'),
    R2_SECRET_ACCESS_KEY: readOptionalString(config, 'R2_SECRET_ACCESS_KEY'),
    ADMIN_NAME: readString(config, 'ADMIN_NAME', 'Local Admin', errors),
    ADMIN_EMAIL: readString(config, 'ADMIN_EMAIL', 'admin@talkto.local', errors),
    ADMIN_PASSWORD: readString(
      config,
      'ADMIN_PASSWORD',
      'Admin1234!',
      errors,
    ),
    BOOTSTRAP_SEED: readBoolean(config, 'BOOTSTRAP_SEED', false, errors),
    FREE_ARCHIVE_AI_SUMMARY_ENABLED: readBoolean(
      config,
      'FREE_ARCHIVE_AI_SUMMARY_ENABLED',
      false,
      errors,
    ),
    FREE_PREVIEW_ANALYSIS_ENABLED: readBoolean(
      config,
      'FREE_PREVIEW_ANALYSIS_ENABLED',
      false,
      errors,
    ),
    S10_PREVIEW_SCREEN_ENABLED: readBoolean(
      config,
      'S10_PREVIEW_SCREEN_ENABLED',
      false,
      errors,
    ),
    GENERATED_VOICE_DOWNLOAD_ENABLED: readBoolean(
      config,
      'GENERATED_VOICE_DOWNLOAD_ENABLED',
      false,
      errors,
    ),
    PAYMENT_PROVIDER: readEnum(
      config,
      'PAYMENT_PROVIDER',
      ['local'],
      'local',
      errors,
    ),
    PAYMENT_WEBHOOK_SECRET: readString(
      config,
      'PAYMENT_WEBHOOK_SECRET',
      'local-payment-webhook-secret',
      errors,
    ),
    PAYMENT_WEBHOOK_TOLERANCE_SECONDS: readNumber(
      config,
      'PAYMENT_WEBHOOK_TOLERANCE_SECONDS',
      300,
      errors,
      { min: 30, max: 900 },
    ),
  };

  if (validatedEnv.AUDIO_STORAGE_DRIVER === 'r2') {
    requireDefined(validatedEnv.R2_ACCOUNT_ID, 'R2_ACCOUNT_ID', errors);
    requireDefined(validatedEnv.R2_BUCKET_NAME, 'R2_BUCKET_NAME', errors);
    requireDefined(validatedEnv.R2_ACCESS_KEY_ID, 'R2_ACCESS_KEY_ID', errors);
    requireDefined(validatedEnv.R2_SECRET_ACCESS_KEY, 'R2_SECRET_ACCESS_KEY', errors);
  }

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
    if (validatedEnv.PAYMENT_WEBHOOK_SECRET === 'local-payment-webhook-secret') {
      errors.push(
        'PAYMENT_WEBHOOK_SECRET must not use the default placeholder in production.',
      );
    }
    rejectEnabledProductionFlag(
      validatedEnv.FREE_ARCHIVE_AI_SUMMARY_ENABLED,
      'FREE_ARCHIVE_AI_SUMMARY_ENABLED',
      errors,
    );
    rejectEnabledProductionFlag(
      validatedEnv.FREE_PREVIEW_ANALYSIS_ENABLED,
      'FREE_PREVIEW_ANALYSIS_ENABLED',
      errors,
    );
    rejectEnabledProductionFlag(
      validatedEnv.S10_PREVIEW_SCREEN_ENABLED,
      'S10_PREVIEW_SCREEN_ENABLED',
      errors,
    );
    rejectEnabledProductionFlag(
      validatedEnv.GENERATED_VOICE_DOWNLOAD_ENABLED,
      'GENERATED_VOICE_DOWNLOAD_ENABLED',
      errors,
    );
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n- ${errors.join('\n- ')}`);
  }

  return validatedEnv;
}

function rejectEnabledProductionFlag(
  value: boolean,
  key: string,
  errors: string[],
) {
  if (value) {
    errors.push(`${key} must remain false in production.`);
  }
}

function requireDefined(
  value: string | undefined,
  key: string,
  errors: string[],
) {
  if (!value) {
    errors.push(`${key} is required.`);
  }
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
