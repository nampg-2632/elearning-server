import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';
import { LessonSummaryDto } from '../../lessons/dto/lesson-summary.dto';

export class CourseCreatorDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Admin' })
  fullName: string;
}

export class CourseLessonDto extends LessonSummaryDto {
  @ApiProperty({ example: 1, description: 'Starts at 1' })
  position: number;
}

export class AdminCourseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'TOEIC 600 Vocabulary' })
  name: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: String, nullable: true })
  thumbnailUrl: string | null;

  @ApiProperty({ example: 12 })
  lessonCount: number;

  @ApiProperty({ example: 35, description: 'Approved students' })
  studentCount: number;

  @ApiProperty({ example: 3, description: 'Enrollments waiting for review' })
  pendingCount: number;

  @ApiProperty({ type: CourseCreatorDto })
  createdBy: CourseCreatorDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class AdminCourseDetailDto extends AdminCourseDto {
  @ApiProperty({ type: [CourseLessonDto] })
  lessons: CourseLessonDto[];
}

export class AdminCoursePageDto {
  @ApiProperty({ type: [AdminCourseDto] })
  items: AdminCourseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
