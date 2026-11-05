import { ApiProperty } from '@nestjs/swagger';

export type DependencyStatus = 'up' | 'down';

export class LivenessDto {
  @ApiProperty({ enum: ['ok'] })
  status: 'ok';
}

class HealthChecksDto {
  @ApiProperty({ enum: ['up', 'down'] })
  database: DependencyStatus;

  @ApiProperty({ enum: ['up', 'down'] })
  redis: DependencyStatus;
}

export class HealthReportDto {
  @ApiProperty({ enum: ['ok', 'error'] })
  status: 'ok' | 'error';

  @ApiProperty({ type: HealthChecksDto })
  checks: HealthChecksDto;
}
