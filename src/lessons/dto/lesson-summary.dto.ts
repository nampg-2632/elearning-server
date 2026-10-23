import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';

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

export class LessonSummaryPageDto {
  @ApiProperty({ type: [LessonSummaryDto] })
  items: LessonSummaryDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
