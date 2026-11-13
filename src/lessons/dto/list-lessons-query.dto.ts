import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { trimString } from '../../common/utils/transforms';
import { AdminLessonSort } from '../enums/admin-lesson-sort.enum';
import { LESSON_TITLE_MAX_LENGTH } from '../lessons.constants';

export class ListLessonsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Lesson title contains (ILIKE)' })
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MaxLength(LESSON_TITLE_MAX_LENGTH, {
    message: i18nValidationMessage('validation.MAX_LENGTH'),
  })
  keyword?: string;

  @ApiPropertyOptional({
    enum: AdminLessonSort,
    enumName: 'AdminLessonSort',
    default: AdminLessonSort.TitleAsc,
  })
  @IsOptional()
  @IsEnum(AdminLessonSort, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  sort: AdminLessonSort = AdminLessonSort.TitleAsc;
}
