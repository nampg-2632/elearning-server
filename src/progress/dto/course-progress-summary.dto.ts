import { ApiProperty } from '@nestjs/swagger';

export class CourseProgressSummaryDto {
  @ApiProperty({ example: 12 })
  totalLessons: number;

  @ApiProperty({ example: 5 })
  passedLessons: number;

  @ApiProperty({ example: 41.67, description: 'Rounded to 2 decimals' })
  percent: number;
}
