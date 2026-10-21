import { registerAs } from '@nestjs/config';

const parseList = (value?: string): string[] =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const appConfig = registerAs('app', () => ({
  env: process.env.NODE_ENV ?? 'development',
  name: process.env.APP_NAME ?? 'e-Learning',
  port: Number(process.env.PORT ?? 3000),
  url: process.env.APP_URL ?? 'http://localhost:3000',
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  corsOrigins: parseList(process.env.CORS_ORIGINS),
  fallbackLanguage: process.env.FALLBACK_LANGUAGE ?? 'vi',
}));
