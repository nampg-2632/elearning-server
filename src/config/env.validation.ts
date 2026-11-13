import { plainToInstance, Type } from 'class-transformer';
import {
  IsBooleanString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateIf,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  APP_NAME: string = 'e-Learning';

  @IsUrl({ require_tld: false })
  APP_URL: string = 'http://localhost:3000';

  // Path segments without leading/trailing slash, e.g. "api/v1".
  @Matches(/^[a-z0-9-]+(\/[a-z0-9-]+)*$/)
  API_PREFIX: string = 'api/v1';

  // Comma-separated list of allowed origins; empty disables CORS.
  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  @IsEnum(['vi', 'en'])
  FALLBACK_LANGUAGE: string = 'vi';

  // Reverse proxies in front of the app (Caddy in production = 1). Lets
  // Express read the client IP from X-Forwarded-For, which the auth rate
  // limit keys on. Keep 0 when exposed directly, or clients could spoof it.
  @Type(() => Number)
  @IsInt()
  @Min(0)
  TRUST_PROXY: number = 0;

  @IsNotEmpty()
  @IsString()
  DATABASE_URL!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  DATABASE_POOL_MAX: number = 10;

  @IsBooleanString()
  DATABASE_LOGGING: string = 'false';

  @IsNotEmpty()
  @IsString()
  REDIS_URL!: string;

  @IsString()
  REDIS_KEY_PREFIX: string = 'elearning:';

  // HS256 signing key; at least 32 characters.
  @IsString()
  @MinLength(32)
  JWT_SECRET!: string;

  @Type(() => Number)
  @IsInt()
  @Min(60)
  JWT_EXPIRES_IN_SECONDS: number = 86400;

  // Development falls back to Mailpit on localhost:1025; production must say
  // where mail goes, or every mail would fail in the background.
  @ValidateIf(
    (env: EnvironmentVariables) =>
      env.NODE_ENV === NodeEnv.Production || env.MAIL_HOST !== undefined,
  )
  @IsNotEmpty()
  @IsString()
  MAIL_HOST?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  MAIL_PORT: number = 1025;

  @IsBooleanString()
  MAIL_SECURE: string = 'false';

  // Both empty when the server takes mail without a login (Mailpit, the
  // Postfix container on the VPS).
  @IsOptional()
  @IsString()
  MAIL_USER?: string;

  @IsOptional()
  @IsString()
  MAIL_PASSWORD?: string;

  // e.g. e-Learning <no-reply@example.com>
  @ValidateIf(
    (env: EnvironmentVariables) =>
      env.NODE_ENV === NodeEnv.Production || env.MAIL_FROM !== undefined,
  )
  @IsNotEmpty()
  @IsString()
  MAIL_FROM?: string;

  // Mails per hour across every app instance; 0 = no limit.
  @Type(() => Number)
  @IsInt()
  @Min(0)
  MAIL_RATE_PER_HOUR: number = 0;
}

// Used by ConfigModule.forRoot({ validate }): the app refuses to boot with a
// malformed variable instead of failing later at first use.
export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('\n');
    throw new Error(`Invalid environment variables:\n${details}`);
  }

  return validated;
}
