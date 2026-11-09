import type { DataSource } from 'typeorm';
import type { RedisService } from '../redis/redis.service';
import { DependencyStatus } from './enums/dependency-status.enum';
import { HealthStatus } from './enums/health-status.enum';
import { HealthCheckFailedException } from './exceptions/health-check-failed.exception';
import { CHECK_TIMEOUT_MS, HealthService } from './health.service';

describe('HealthService.readiness', () => {
  let service: HealthService;
  let dataSource: { query: jest.Mock };
  let redis: { ping: jest.Mock };

  beforeEach(() => {
    dataSource = { query: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    redis = { ping: jest.fn().mockResolvedValue('PONG') };
    service = new HealthService(
      dataSource as unknown as DataSource,
      redis as unknown as RedisService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports ok when Postgres and Redis answer', async () => {
    await expect(service.readiness()).resolves.toEqual({
      status: HealthStatus.Ok,
      checks: { database: DependencyStatus.Up, redis: DependencyStatus.Up },
    });
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('reports the failing dependency as down', async () => {
    dataSource.query.mockRejectedValue(new Error('connection refused'));

    await expect(service.readiness()).resolves.toEqual({
      status: HealthStatus.Error,
      checks: { database: DependencyStatus.Down, redis: DependencyStatus.Up },
    });
  });

  it('treats a dependency that never answers as down', async () => {
    jest.useFakeTimers();
    redis.ping.mockReturnValue(new Promise(() => {}));

    const report = service.readiness();
    await jest.advanceTimersByTimeAsync(CHECK_TIMEOUT_MS);

    await expect(report).resolves.toEqual({
      status: HealthStatus.Error,
      checks: { database: DependencyStatus.Up, redis: DependencyStatus.Down },
    });
  });
});

describe('HealthService.ready', () => {
  let service: HealthService;
  let dataSource: { query: jest.Mock };

  beforeEach(() => {
    dataSource = { query: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const redis = { ping: jest.fn().mockResolvedValue('PONG') };
    service = new HealthService(
      dataSource as unknown as DataSource,
      redis as unknown as RedisService,
    );
  });

  it('returns the report when every dependency is up', async () => {
    await expect(service.ready()).resolves.toEqual({
      status: HealthStatus.Ok,
      checks: { database: DependencyStatus.Up, redis: DependencyStatus.Up },
    });
  });

  it('throws the report when a dependency is down', async () => {
    dataSource.query.mockRejectedValue(new Error('connection refused'));

    const error = await service.ready().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HealthCheckFailedException);
    expect((error as HealthCheckFailedException).report).toEqual({
      status: HealthStatus.Error,
      checks: { database: DependencyStatus.Down, redis: DependencyStatus.Up },
    });
  });
});
