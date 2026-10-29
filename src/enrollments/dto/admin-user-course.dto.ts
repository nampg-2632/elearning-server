import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';
import { EnrollmentStatus } from '../enums/enrollment-status.enum';

export class UserCourseStudentDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Phạm Giang Nam' })
  fullName: string;

  @ApiProperty({ example: 'nam@example.com' })
  email: string;
}

export class UserCourseCourseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'TOEIC 600 Vocabulary' })
  name: string;
}

export class UserCourseReviewerDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Admin' })
  fullName: string;
}

export class AdminUserCourseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: EnrollmentStatus, enumName: 'EnrollmentStatus' })
  status: EnrollmentStatus;

  @ApiProperty({ type: UserCourseStudentDto })
  user: UserCourseStudentDto;

  @ApiProperty({ type: UserCourseCourseDto })
  course: UserCourseCourseDto;

  @ApiProperty({ type: UserCourseReviewerDto, nullable: true })
  reviewedBy: UserCourseReviewerDto | null;

  @ApiProperty({ type: Date, nullable: true })
  reviewedAt: Date | null;

  @ApiProperty({ type: String, nullable: true })
  rejectReason: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class AdminUserCoursePageDto {
  @ApiProperty({ type: [AdminUserCourseDto] })
  items: AdminUserCourseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
