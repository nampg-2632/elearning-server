import { ApiProperty } from '@nestjs/swagger';

export class LessonSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Office & Workplace' })
  title: string;

  @ApiProperty({ example: 10 })
  wordCount: number;

  @ApiProperty()
  hasTest: boolean;
}
