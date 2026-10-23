import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { trimString } from '../../common/utils/transforms';
import { CreateCourseDto } from './create-course.dto';

// Lessons are changed through PUT /admin/courses/:id/lessons.
export class UpdateCourseDto extends PartialType(
  OmitType(CreateCourseDto, ['name', 'lessonIds'] as const),
) {
  // Optional, but unlike description it cannot be cleared with null.
  @ApiPropertyOptional({ example: 'TOEIC 600 Vocabulary', maxLength: 255 })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(trimString)
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MaxLength(255, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  name?: string;
}
