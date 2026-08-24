import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsOptional()
  @IsIn(['development', 'test', 'production'])
  NODE_ENV?: string;

  @IsString()
  @MinLength(16, {
    message:
      'JWT_SECRET must be set to a real random value (min 16 chars) — refusing to start with a default/weak secret',
  })
  JWT_SECRET: string;

  @IsString()
  @MinLength(16, {
    message:
      'JWT_REFRESH_SECRET must be set to a real random value (min 16 chars) — refusing to start with a default/weak secret',
  })
  JWT_REFRESH_SECRET: string;

  @IsString()
  @MinLength(1)
  POSTGRES_USER: string;

  @IsString()
  @MinLength(1)
  POSTGRES_PASSWORD: string;

  @IsString()
  @MinLength(1)
  POSTGRES_DB: string;

  @IsOptional()
  @IsString()
  DEEPINFRA_API_KEY?: string;
}

/**
 * Fails application boot if required secrets/config are missing, instead of
 * silently falling back to insecure defaults (a default JWT secret, a
 * default DB password, etc.). Passed to ConfigModule.forRoot({ validate }).
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  // Unit/e2e test runs don't load a full .env — don't force secrets on them.
  if (config.NODE_ENV === 'test') {
    return config;
  }

  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .flatMap((e) => Object.values(e.constraints ?? {}))
      .join('; ');
    throw new Error(`Invalid environment configuration: ${messages}`);
  }

  return { ...config, ...validatedConfig };
}
