import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  env: process.env.NODE_ENV ?? 'development',
  name: process.env.APP_NAME ?? 'e-Learning',
  port: Number(process.env.PORT ?? 3000),
  url: process.env.APP_URL ?? 'http://localhost:3000',
  fallbackLanguage: process.env.FALLBACK_LANGUAGE ?? 'vi',
}));
