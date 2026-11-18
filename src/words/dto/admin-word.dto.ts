import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';
import { WordLessonDto } from './word.dto';

export class AdminWordDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'deadline' })
  content: string;

  @ApiProperty({ example: 'hạn chót' })
  meaning: string;

  @ApiProperty({ example: 2 })
  lessonCount: number;

  @ApiProperty()
  createdAt: Date;
}

export class AdminWordPageDto {
  @ApiProperty({ type: [AdminWordDto] })
  items: AdminWordDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class AdminWordDetailDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'deadline' })
  content: string;

  @ApiProperty({ example: 'hạn chót' })
  meaning: string;

  @ApiProperty({
    type: [WordLessonDto],
    description: 'Lessons containing the word, by title',
  })
  lessons: WordLessonDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
