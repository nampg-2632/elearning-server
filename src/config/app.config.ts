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
  // Base of the links in mails (verify email, reset password). Fixed by
  // config, never taken from the request's Host header.
  frontendUrl: (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(
    /\/+$/,
    '',
  ),
  fallbackLanguage: process.env.FALLBACK_LANGUAGE ?? 'vi',
  trustProxy: Number(process.env.TRUST_PROXY ?? 0),
}));
