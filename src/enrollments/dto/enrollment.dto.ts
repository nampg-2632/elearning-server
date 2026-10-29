import { ApiProperty } from '@nestjs/swagger';
import { EnrollmentStatus } from '../enums/enrollment-status.enum';

// The current user's enrollment, embedded in course responses.
export class EnrollmentSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: EnrollmentStatus, enumName: 'EnrollmentStatus' })
  status: EnrollmentStatus;
}

export class EnrollmentDto extends EnrollmentSummaryDto {
  @ApiProperty({ format: 'uuid' })
  courseId: string;

  @ApiProperty()
  createdAt: Date;
}
