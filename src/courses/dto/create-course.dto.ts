import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { trimString } from '../../common/utils/transforms';
import {
  COURSE_NAME_MAX_LENGTH,
  COURSE_THUMBNAIL_URL_MAX_LENGTH,
} from '../courses.constants';

export class CreateCourseDto {
  @ApiProperty({
    example: 'TOEIC 600 Vocabulary',
    maxLength: COURSE_NAME_MAX_LENGTH,
  })
  @Transform(trimString)
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MaxLength(COURSE_NAME_MAX_LENGTH, {
    message: i18nValidationMessage('validation.MAX_LENGTH'),
  })
  name: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  description?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: COURSE_THUMBNAIL_URL_MAX_LENGTH,
  })
  @IsOptional()
  @IsUrl({}, { message: i18nValidationMessage('validation.IS_URL') })
  @MaxLength(COURSE_THUMBNAIL_URL_MAX_LENGTH, {
    message: i18nValidationMessage('validation.MAX_LENGTH'),
  })
  thumbnailUrl?: string | null;

  // Array order becomes the lesson position in the course.
  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @IsArray({ message: i18nValidationMessage('validation.IS_ARRAY') })
  @ArrayUnique({ message: i18nValidationMessage('validation.ARRAY_UNIQUE') })
  @IsUUID('all', {
    each: true,
    message: i18nValidationMessage('validation.IS_UUID'),
  })
  lessonIds?: string[];
}
