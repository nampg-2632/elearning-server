import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { trimString } from '../../common/utils/transforms';
import { WORD_CONTENT_MAX_LENGTH } from '../words.constants';

// Lessons are changed through PUT /admin/lessons/:id/words. Both fields are
// optional but cannot be cleared with null.
export class UpdateWordDto {
  @ApiPropertyOptional({
    example: 'deadline',
    maxLength: WORD_CONTENT_MAX_LENGTH,
  })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(trimString)
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MaxLength(WORD_CONTENT_MAX_LENGTH, {
    message: i18nValidationMessage('validation.MAX_LENGTH'),
  })
  content?: string;

  @ApiPropertyOptional({ example: 'hạn chót' })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(trimString)
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  meaning?: string;
}
