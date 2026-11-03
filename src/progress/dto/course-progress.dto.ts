import { ApiProperty } from '@nestjs/swagger';
import { CourseProgressSummaryDto } from './course-progress-summary.dto';

export class LessonStatusCountsDto {
  @ApiProperty({ example: 5 })
  todo: number;

  @ApiProperty({ example: 1 })
  doing: number;

  @ApiProperty({ example: 5 })
  pass: number;

  @ApiProperty({ example: 1 })
  fail: number;
}

export class CourseProgressDto extends CourseProgressSummaryDto {
  @ApiProperty({ format: 'uuid' })
  courseId: string;

  @ApiProperty({ type: LessonStatusCountsDto })
  lessons: LessonStatusCountsDto;
}
