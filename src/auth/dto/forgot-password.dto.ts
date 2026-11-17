import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { normalizeEmail } from '../../common/utils/transforms';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user1@elearning.local' })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  @MaxLength(320, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  email: string;
}
