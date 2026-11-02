import { ApiProperty } from '@nestjs/swagger';
import { LessonStatus } from '../../progress/enums/lesson-status.enum';

// A lesson in a course with the current user's status.
export class CourseLessonDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Lesson 1 – Office' })
  title: string;

  @ApiProperty({ example: 1 })
  position: number;

  @ApiProperty({ example: 6 })
  wordCount: number;

  @ApiProperty({ enum: LessonStatus, enumName: 'LessonStatus' })
  status: LessonStatus;

  @ApiProperty({ type: Number, nullable: true, example: 90 })
  bestScore: number | null;
}

export class CourseLessonListDto {
  @ApiProperty({ type: [CourseLessonDto] })
  items: CourseLessonDto[];
}
