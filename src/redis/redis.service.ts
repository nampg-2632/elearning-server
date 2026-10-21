import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { createClient } from 'redis';
import { redisConfig } from '../config/redis.config';

type RedisClient = ReturnType<typeof createClient>;

const STARTUP_MAX_RETRIES = 5;
const MAX_RECONNECT_DELAY_MS = 3000;

// ECONNREFUSED on dual-stack hosts arrives as an AggregateError with an
// empty message, so fall back to the error code/name.
const describeError = (error: Error & { code?: string }): string =>
  error.message || error.code || error.name;

// Thin wrapper over node-redis. Every key is namespaced with
// REDIS_KEY_PREFIX, so callers pass bare keys like "auth:blacklist:<hash>".
@Injectable()
export class RedisService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: RedisClient;
  private readonly url: string;
  private connected = false;

  constructor(
    @Inject(redisConfig.KEY)
    config: ConfigType<typeof redisConfig>,
  ) {
    this.url = config.url;
    this.client = createClient({
      url: config.url,
      keyPrefix: config.keyPrefix,
      name: 'elearning-api',
      socket: {
        // Fail fast at startup instead of hanging forever; once the app is
        // up, keep reconnecting with a capped backoff.
        reconnectStrategy: (retries, cause) =>
          !this.connected && retries >= STARTUP_MAX_RETRIES
            ? cause
            : Math.min(2 ** retries * 100, MAX_RECONNECT_DELAY_MS),
      },
    });

    this.client.on('error', (error: Error) => {
      this.logger.error(`Redis client error: ${describeError(error)}`);
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
      await this.client.ping();
    } catch {
      throw new Error(
        `Cannot connect to Redis at ${this.url} after ${STARTUP_MAX_RETRIES} retries`,
      );
    }
    this.connected = true;
    this.logger.log('Redis connection established');
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.close();
    }
  }

  get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    await this.client.set(
      key,
      value,
      ttlSeconds ? { expiration: { type: 'EX', value: ttlSeconds } } : {},
    );
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    return value === null ? null : (JSON.parse(value) as T);
  }

  setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    return this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async del(...keys: string[]): Promise<number> {
    return keys.length > 0 ? this.client.del(keys) : 0;
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) > 0;
  }
}
