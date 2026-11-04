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
import { WordSort } from '../enums/word-sort.enum';
import { WordStatusFilter } from '../enums/word-status-filter.enum';
import { WORD_KEYWORD_MAX_LENGTH } from '../words.constants';

export class ListWordsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: WordStatusFilter,
    enumName: 'WordStatusFilter',
    default: WordStatusFilter.All,
  })
  @IsOptional()
  @IsEnum(WordStatusFilter, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  status: WordStatusFilter = WordStatusFilter.All;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: i18nValidationMessage('validation.IS_UUID') })
  courseId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: i18nValidationMessage('validation.IS_UUID') })
  lessonId?: string;

  @ApiPropertyOptional({ description: 'Content or meaning contains (ILIKE)' })
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MaxLength(WORD_KEYWORD_MAX_LENGTH, {
    message: i18nValidationMessage('validation.MAX_LENGTH'),
  })
  keyword?: string;

  @ApiPropertyOptional({
    enum: WordSort,
    enumName: 'WordSort',
    default: WordSort.ContentAsc,
  })
  @IsOptional()
  @IsEnum(WordSort, { message: i18nValidationMessage('validation.IS_ENUM') })
  sort: WordSort = WordSort.ContentAsc;
}
