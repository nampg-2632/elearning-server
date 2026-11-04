import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';

export class WordLessonDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Office & Workplace' })
  title: string;
}

export class WordDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'deadline' })
  content: string;

  @ApiProperty({ example: 'hạn chót' })
  meaning: string;

  @ApiProperty({ description: 'In a lesson the user has passed' })
  learned: boolean;

  @ApiProperty({
    type: [WordLessonDto],
    description: 'Lessons containing the word, within the filters',
  })
  lessons: WordLessonDto[];
}

export class WordPageDto {
  @ApiProperty({ type: [WordDto] })
  items: WordDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
