import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { trimString } from '../../common/utils/transforms';

export enum AdminCourseSort {
  CreatedAtDesc = '-createdAt',
  CreatedAtAsc = 'createdAt',
  NameAsc = 'name',
  NameDesc = '-name',
}

// A bare date, or a date-time with an explicit offset. A date-time without
// one would be read in the server's local time zone.
const DATE_OR_ZONED_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}(T[^Z+-]+(Z|[+-]\d{2}(:?\d{2})?))?$/i;

export class ListAdminCoursesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Course name contains (ILIKE)' })
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MaxLength(255, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  keyword?: string;

  @ApiPropertyOptional({
    description: 'Has a pending/approved student whose name contains this',
  })
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MaxLength(100, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  studentName?: string;

  @ApiPropertyOptional({
    example: '2026-10-01',
    description: 'Inclusive; a date-time must include Z or an offset',
  })
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: i18nValidationMessage('validation.IS_DATE_STRING') },
  )
  @Matches(DATE_OR_ZONED_DATE_TIME, {
    message: i18nValidationMessage('validation.DATE_TIMEZONE_REQUIRED'),
  })
  createdFrom?: string;

  @ApiPropertyOptional({
    example: '2026-10-31',
    description:
      'Inclusive; a bare date covers the whole UTC day, a date-time must include Z or an offset',
  })
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: i18nValidationMessage('validation.IS_DATE_STRING') },
  )
  @Matches(DATE_OR_ZONED_DATE_TIME, {
    message: i18nValidationMessage('validation.DATE_TIMEZONE_REQUIRED'),
  })
  createdTo?: string;

  @ApiPropertyOptional({
    enum: AdminCourseSort,
    enumName: 'AdminCourseSort',
    default: AdminCourseSort.CreatedAtDesc,
  })
  @IsOptional()
  @IsEnum(AdminCourseSort, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  sort: AdminCourseSort = AdminCourseSort.CreatedAtDesc;
}
