import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { trimString } from '../../common/utils/transforms';
import { COURSE_NAME_MAX_LENGTH } from '../courses.constants';

export class ListCoursesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Course name contains (ILIKE)' })
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MaxLength(COURSE_NAME_MAX_LENGTH, {
    message: i18nValidationMessage('validation.MAX_LENGTH'),
  })
  keyword?: string;
}
