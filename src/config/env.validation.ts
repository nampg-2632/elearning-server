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

  @IsNotEmpty()
  @IsString()
  DATABASE_URL!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  DATABASE_POOL_MAX: number = 10;

  @IsBooleanString()
  DATABASE_LOGGING: string = 'false';
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
