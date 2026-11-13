import type { RedisOptions } from 'bullmq';

// BullMQ (ioredis) takes options, not a URL. Reads
// redis[s]://[user[:password]@]host[:port][/db] as REDIS_URL is written.
export const parseRedisUrl = (url: string): RedisOptions => {
  const parsed = new URL(url);
  const db = parsed.pathname.replace(/^\//, '');
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: db ? Number(db) : undefined,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
  };
};
