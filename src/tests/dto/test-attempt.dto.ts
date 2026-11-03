import { ApiProperty } from '@nestjs/swagger';
import { AttemptStatus } from '../enums/attempt-status.enum';

export class AttemptOptionDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'hạn chót' })
  content: string;
}

export class AttemptQuestionDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: '"deadline" nghĩa là gì?' })
  content: string;

  @ApiProperty({ type: [AttemptOptionDto], description: 'Ordered by position' })
  options: AttemptOptionDto[];
}

class TestAttemptSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  testId: string;

  @ApiProperty({ format: 'uuid' })
  lessonId: string;

  @ApiProperty({ enum: AttemptStatus, enumName: 'AttemptStatus' })
  status: AttemptStatus;

  @ApiProperty()
  startedAt: Date;
}

// An attempt in progress: questions without the correct answers.
export class TestAttemptDto extends TestAttemptSummaryDto {
  @ApiProperty({
    type: [AttemptQuestionDto],
    description: 'Ordered by position',
  })
  questions: AttemptQuestionDto[];
}

export class AttemptResultQuestionDto extends AttemptQuestionDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'Null when left blank',
  })
  selectedOptionId: string | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  correctOptionId: string | null;

  @ApiProperty()
  isCorrect: boolean;
}

// A submitted attempt with the score and the correct answers.
export class TestAttemptResultDto extends TestAttemptSummaryDto {
  @ApiProperty({ example: 83 })
  score: number;

  @ApiProperty({ example: 80 })
  passScore: number;

  @ApiProperty()
  passed: boolean;

  @ApiProperty({ example: 5 })
  correctCount: number;

  @ApiProperty({ example: 6 })
  totalQuestions: number;

  @ApiProperty()
  submittedAt: Date;

  @ApiProperty({
    type: [AttemptResultQuestionDto],
    description: 'Ordered by position',
  })
  questions: AttemptResultQuestionDto[];
}
