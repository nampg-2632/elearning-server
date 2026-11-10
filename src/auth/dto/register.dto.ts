import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { normalizeEmail, trimString } from '../../common/utils/transforms';
import { USER_FULL_NAME_MAX_LENGTH } from '../../users/users.constants';
import {
  IsNewPassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from './password.decorator';

export class RegisterDto {
  @ApiProperty({ example: 'nam@example.com', maxLength: 320 })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  @MaxLength(320, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  email: string;

  @ApiProperty({
    example: 'Secret123',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @IsNewPassword()
  password: string;

  @ApiProperty({
    example: 'Phạm Giang Nam',
    maxLength: USER_FULL_NAME_MAX_LENGTH,
  })
  @Transform(trimString)
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MaxLength(USER_FULL_NAME_MAX_LENGTH, {
    message: i18nValidationMessage('validation.MAX_LENGTH'),
  })
  fullName: string;
}
