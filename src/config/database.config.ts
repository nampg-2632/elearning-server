import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL ?? '',
  poolMax: Number(process.env.DATABASE_POOL_MAX ?? 10),
  logging: process.env.DATABASE_LOGGING === 'true',
}));
