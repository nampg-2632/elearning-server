import { registerAs } from '@nestjs/config';

export const redisConfig = registerAs('redis', () => ({
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'elearning:',
}));
