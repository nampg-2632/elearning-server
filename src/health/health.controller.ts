import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { HealthReportDto, LivenessDto } from './dto/health-report.dto';
import { HealthService } from './health.service';

// Served outside API_PREFIX (see main.ts) so probes do not depend on it.
@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  // The process is up and serving HTTP. Used by the Docker HEALTHCHECK.
  @Get('live')
  @ApiOkResponse({ type: LivenessDto })
  live(): LivenessDto {
    return { status: 'ok' };
  }

  // Postgres and Redis answer. Used by deploys and uptime checks.
  @Get('ready')
  @ApiOkResponse({ type: HealthReportDto })
  @ApiServiceUnavailableResponse({ type: HealthReportDto })
  async ready(
    @Res({ passthrough: true }) res: Response,
  ): Promise<HealthReportDto> {
    const report = await this.healthService.readiness();
    if (report.status !== 'ok') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return report;
  }
}
