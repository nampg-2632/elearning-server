import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { HealthCheckFailedException } from '../exceptions/health-check-failed.exception';

// Answers 503 with the full report so probes and humans can see which
// dependency is down. The service already logs the cause, so nothing is
// logged here (probes hit this every few seconds).
@Catch(HealthCheckFailedException)
export class HealthCheckFailedFilter implements ExceptionFilter {
  catch(exception: HealthCheckFailedException, host: ArgumentsHost): void {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(HttpStatus.SERVICE_UNAVAILABLE)
      .json(exception.report);
  }
}
