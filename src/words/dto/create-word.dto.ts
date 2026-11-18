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
import { WORD_CONTENT_MAX_LENGTH } from '../words.constants';

export class CreateWordDto {
  @ApiProperty({ example: 'deadline', maxLength: WORD_CONTENT_MAX_LENGTH })
  @Transform(trimString)
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MaxLength(WORD_CONTENT_MAX_LENGTH, {
    message: i18nValidationMessage('validation.MAX_LENGTH'),
  })
  content: string;

  @ApiProperty({ example: 'hạn chót' })
  @Transform(trimString)
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  meaning: string;

  // Appends the new word to the end of each of these lessons.
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
