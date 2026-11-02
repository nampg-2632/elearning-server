import { ApiProperty } from '@nestjs/swagger';
import { LessonStatus } from '../../progress/enums/lesson-status.enum';

export class LessonWordDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'deadline' })
  content: string;

  @ApiProperty({ example: 'hạn chót' })
  meaning: string;
}

export class LessonTestSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 6 })
  questionCount: number;

  @ApiProperty({ example: 80 })
  passScore: number;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'The attempt in progress, if any',
  })
  currentAttemptId: string | null;
}

export class LessonDetailDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Lesson 1 – Office' })
  title: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ enum: LessonStatus, enumName: 'LessonStatus' })
  status: LessonStatus;

  @ApiProperty({ type: Number, nullable: true })
  bestScore: number | null;

  @ApiProperty({ type: [LessonWordDto], description: 'Ordered by position' })
  words: LessonWordDto[];

  @ApiProperty({
    type: LessonTestSummaryDto,
    nullable: true,
    description: 'Null when the lesson has no test',
  })
  test: LessonTestSummaryDto | null;
}
