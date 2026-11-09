import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { HealthReportDto } from '../dto/health-report.dto';
import { DependencyStatus } from '../enums/dependency-status.enum';
import { HealthStatus } from '../enums/health-status.enum';
import { HealthCheckFailedException } from '../exceptions/health-check-failed.exception';
import { HealthCheckFailedFilter } from './health-check-failed.filter';

describe('HealthCheckFailedFilter', () => {
  it('answers 503 with the report as the body', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;
    const report: HealthReportDto = {
      status: HealthStatus.Error,
      checks: { database: DependencyStatus.Up, redis: DependencyStatus.Down },
    };

    new HealthCheckFailedFilter().catch(
      new HealthCheckFailedException(report),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(json).toHaveBeenCalledWith(report);
  });
});
