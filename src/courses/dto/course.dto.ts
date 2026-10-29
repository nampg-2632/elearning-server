import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';
import { EnrollmentSummaryDto } from '../../enrollments/dto/enrollment.dto';
import { CourseProgressSummaryDto } from '../../progress/dto/course-progress-summary.dto';

export class CourseDto {
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

  @ApiProperty({
    type: EnrollmentSummaryDto,
    nullable: true,
    description: "The current user's enrollment, null if not enrolled",
  })
  enrollment: EnrollmentSummaryDto | null;

  @ApiProperty()
  createdAt: Date;
}

export class CourseDetailDto extends CourseDto {
  @ApiProperty({
    type: CourseProgressSummaryDto,
    nullable: true,
    description: 'Only when the enrollment is approved',
  })
  progress: CourseProgressSummaryDto | null;
}

export class CoursePageDto {
  @ApiProperty({ type: [CourseDto] })
  items: CourseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class MyCoursePageDto {
  @ApiProperty({ type: [CourseDetailDto] })
  items: CourseDetailDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
