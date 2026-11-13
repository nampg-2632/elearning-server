import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { trimString } from '../../common/utils/transforms';
import { LESSON_TITLE_MAX_LENGTH } from '../lessons.constants';

export class CreateLessonDto {
  @ApiProperty({
    example: 'Office & Workplace',
    maxLength: LESSON_TITLE_MAX_LENGTH,
  })
  @Transform(trimString)
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MaxLength(LESSON_TITLE_MAX_LENGTH, {
    message: i18nValidationMessage('validation.MAX_LENGTH'),
  })
  title: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  description?: string | null;

  // Array order becomes the word position in the lesson.
  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @IsArray({ message: i18nValidationMessage('validation.IS_ARRAY') })
  @ArrayUnique({ message: i18nValidationMessage('validation.ARRAY_UNIQUE') })
  @IsUUID('all', {
    each: true,
    message: i18nValidationMessage('validation.IS_UUID'),
  })
  wordIds?: string[];

  // Also appends the new lesson to the end of this course.
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: i18nValidationMessage('validation.IS_UUID') })
  courseId?: string;
}
