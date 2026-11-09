import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { withTimeout } from '../common/utils/with-timeout';
import { RedisService } from '../redis/redis.service';
import { HealthReportDto } from './dto/health-report.dto';
import { DependencyStatus } from './enums/dependency-status.enum';
import { HealthStatus } from './enums/health-status.enum';

// A dependency that does not answer in time counts as down, so a stuck
// connection (e.g. Redis reconnecting with commands queued) cannot hang
// the readiness probe.
export const CHECK_TIMEOUT_MS = 2000;

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
    const healthy =
      database === DependencyStatus.Up && redis === DependencyStatus.Up;
    return {
      status: healthy ? HealthStatus.Ok : HealthStatus.Error,
      checks: { database, redis },
    };
  }

  private async check(
    name: string,
    probe: () => Promise<unknown>,
  ): Promise<DependencyStatus> {
    try {
      await withTimeout(probe(), CHECK_TIMEOUT_MS);
      return DependencyStatus.Up;
    } catch (error) {
      this.logger.warn(`${name} is down: ${(error as Error).message}`);
      return DependencyStatus.Down;
    }
  }
}
