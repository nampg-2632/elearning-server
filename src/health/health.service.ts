import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { DependencyStatus, HealthReportDto } from './dto/health-report.dto';

// A dependency that does not answer in time counts as down, so a stuck
// connection (e.g. Redis reconnecting with commands queued) cannot hang
// the readiness probe.
export const CHECK_TIMEOUT_MS = 2000;

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out after ${ms}ms`)),
      ms,
    );
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly redis: RedisService,
  ) {}

  async readiness(): Promise<HealthReportDto> {
    const [database, redis] = await Promise.all([
      this.check('database', () => this.dataSource.query('SELECT 1')),
      this.check('redis', () => this.redis.ping()),
    ]);
    const healthy = database === 'up' && redis === 'up';
    return { status: healthy ? 'ok' : 'error', checks: { database, redis } };
  }

  private async check(
    name: string,
    probe: () => Promise<unknown>,
  ): Promise<DependencyStatus> {
    try {
      await withTimeout(probe(), CHECK_TIMEOUT_MS);
      return 'up';
    } catch (error) {
      this.logger.warn(`${name} is down: ${(error as Error).message}`);
      return 'down';
    }
  }
}
