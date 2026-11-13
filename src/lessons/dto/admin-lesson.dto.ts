import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';
import { LessonSummaryDto } from './lesson-summary.dto';

export class AdminLessonDto extends LessonSummaryDto {
  @ApiProperty({ example: 2, description: 'Courses not deleted' })
  courseCount: number;

  @ApiProperty()
  createdAt: Date;
}

export class AdminLessonPageDto {
  @ApiProperty({ type: [AdminLessonDto] })
  items: AdminLessonDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class AdminLessonWordDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'deadline' })
  content: string;

  @ApiProperty({ example: 'hạn chót' })
  meaning: string;

  @ApiProperty({ example: 1, description: 'Starts at 1' })
  position: number;
}

export class AdminLessonTestDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 6 })
  questionCount: number;

  @ApiProperty({ example: 80 })
  passScore: number;

  @ApiProperty({ description: 'Someone has started or submitted the test' })
  hasAttempts: boolean;
}

export class AdminLessonCourseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'TOEIC 600 Vocabulary' })
  name: string;
}

export class AdminLessonDetailDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Office & Workplace' })
  title: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: [AdminLessonWordDto], description: 'By position' })
  words: AdminLessonWordDto[];

  @ApiProperty({
    type: AdminLessonTestDto,
    nullable: true,
    description: 'Null when the lesson has no test',
  })
  test: AdminLessonTestDto | null;

  @ApiProperty({
    type: [AdminLessonCourseDto],
    description: 'Courses not deleted, by name',
  })
  courses: AdminLessonCourseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
