import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsUUID } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class SetLessonWordsDto {
  // Replaces the whole list; array order becomes the position. Empty
  // array removes every word from the lesson.
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray({ message: i18nValidationMessage('validation.IS_ARRAY') })
  @ArrayUnique({ message: i18nValidationMessage('validation.ARRAY_UNIQUE') })
  @IsUUID('all', {
    each: true,
    message: i18nValidationMessage('validation.IS_UUID'),
  })
  wordIds: string[];
}
