import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { trimString } from '../../common/utils/transforms';
import { STUDENT_KEYWORD_MAX_LENGTH } from '../enrollments.constants';
import { EnrollmentStatus } from '../enums/enrollment-status.enum';
import { UserCourseSort } from '../enums/user-course-sort.enum';

export class ListUserCoursesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: EnrollmentStatus, enumName: 'EnrollmentStatus' })
  @IsOptional()
  @IsEnum(EnrollmentStatus, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  status?: EnrollmentStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: i18nValidationMessage('validation.IS_UUID') })
  courseId?: string;

  @ApiPropertyOptional({
    description: 'Student name or email contains (ILIKE)',
  })
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MaxLength(STUDENT_KEYWORD_MAX_LENGTH, {
    message: i18nValidationMessage('validation.MAX_LENGTH'),
  })
  keyword?: string;

  @ApiPropertyOptional({
    enum: UserCourseSort,
    enumName: 'UserCourseSort',
    default: UserCourseSort.CreatedAtDesc,
  })
  @IsOptional()
  @IsEnum(UserCourseSort, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  sort: UserCourseSort = UserCourseSort.CreatedAtDesc;
}
