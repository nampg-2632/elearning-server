import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { normalizeEmail, trimString } from '../../common/utils/transforms';

export class RegisterDto {
  @ApiProperty({ example: 'nam@example.com', maxLength: 320 })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  @MaxLength(320, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  email: string;

  // 8–72 characters with at least one letter and one digit.
  @ApiProperty({ example: 'Secret123', minLength: 8, maxLength: 72 })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(8, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  @MaxLength(72, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: i18nValidationMessage('validation.PASSWORD_WEAK'),
  })
  password: string;

  @ApiProperty({ example: 'Phạm Giang Nam', maxLength: 100 })
  @Transform(trimString)
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MaxLength(100, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  fullName: string;
}
