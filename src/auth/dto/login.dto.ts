import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { normalizeEmail } from '../../common/utils/transforms';

// No strength rules here: a wrong password must yield INVALID_CREDENTIALS,
// not a validation error that hints at the password policy.
export class LoginDto {
  @ApiProperty({ example: 'user1@elearning.local' })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  @MaxLength(320, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  email: string;

  @ApiProperty({ example: 'User12345' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MaxLength(72, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  password: string;
}
