import { Controller, Get, UseFilters } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { HealthReportDto, LivenessDto } from './dto/health-report.dto';
import { HealthStatus } from './enums/health-status.enum';
import { HealthCheckFailedFilter } from './filters/health-check-failed.filter';
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
    return { status: HealthStatus.Ok };
  }

  // Postgres and Redis answer. Used by deploys and uptime checks.
  @Get('ready')
  @ApiOkResponse({ type: HealthReportDto })
  @ApiServiceUnavailableResponse({ type: HealthReportDto })
  @UseFilters(HealthCheckFailedFilter)
  ready(): Promise<HealthReportDto> {
    return this.healthService.ready();
  }
}
