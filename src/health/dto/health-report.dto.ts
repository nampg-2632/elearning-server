import { ApiProperty } from '@nestjs/swagger';
import { DependencyStatus } from '../enums/dependency-status.enum';
import { HealthStatus } from '../enums/health-status.enum';

export class LivenessDto {
  @ApiProperty({ enum: [HealthStatus.Ok] })
  status: HealthStatus.Ok;
}

class HealthChecksDto {
  @ApiProperty({ enum: DependencyStatus, enumName: 'DependencyStatus' })
  database: DependencyStatus;

  @ApiProperty({ enum: DependencyStatus, enumName: 'DependencyStatus' })
  redis: DependencyStatus;
}

export class HealthReportDto {
  @ApiProperty({ enum: HealthStatus, enumName: 'HealthStatus' })
  status: HealthStatus;

  @ApiProperty({ type: HealthChecksDto })
  checks: HealthChecksDto;
}
