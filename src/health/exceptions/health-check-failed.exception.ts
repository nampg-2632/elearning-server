import type { HealthReportDto } from '../dto/health-report.dto';

// Thrown when a dependency is down. Not an HttpException: the 503 and the
// response body are decided by HealthCheckFailedFilter, not the global
// filter, so the report reaches the caller as is.
export class HealthCheckFailedException extends Error {
  constructor(readonly report: HealthReportDto) {
    super('Health check failed');
  }
}
