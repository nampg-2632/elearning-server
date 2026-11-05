import type { DataSource } from 'typeorm';
import type { RedisService } from '../redis/redis.service';
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
      status: 'ok',
      checks: { database: 'up', redis: 'up' },
    });
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('reports the failing dependency as down', async () => {
    dataSource.query.mockRejectedValue(new Error('connection refused'));

    await expect(service.readiness()).resolves.toEqual({
      status: 'error',
      checks: { database: 'down', redis: 'up' },
    });
  });

  it('treats a dependency that never answers as down', async () => {
    jest.useFakeTimers();
    redis.ping.mockReturnValue(new Promise(() => {}));

    const report = service.readiness();
    await jest.advanceTimersByTimeAsync(CHECK_TIMEOUT_MS);

    await expect(report).resolves.toEqual({
      status: 'error',
      checks: { database: 'up', redis: 'down' },
    });
  });
});
