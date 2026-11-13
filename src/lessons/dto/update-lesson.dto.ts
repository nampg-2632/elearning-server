import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { trimString } from '../../common/utils/transforms';
import { LESSON_TITLE_MAX_LENGTH } from '../lessons.constants';
import { CreateLessonDto } from './create-lesson.dto';

// Words are changed through PUT /admin/lessons/:id/words and courses
// through PUT /admin/courses/:id/lessons.
export class UpdateLessonDto extends PartialType(
  OmitType(CreateLessonDto, ['title', 'wordIds', 'courseId'] as const),
) {
  // Optional, but unlike description it cannot be cleared with null.
  @ApiPropertyOptional({
    example: 'Office & Workplace',
    maxLength: LESSON_TITLE_MAX_LENGTH,
  })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(trimString)
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MaxLength(LESSON_TITLE_MAX_LENGTH, {
    message: i18nValidationMessage('validation.MAX_LENGTH'),
  })
  title?: string;
}
