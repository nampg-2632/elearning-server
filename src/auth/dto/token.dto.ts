import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import {
  IsNewPassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from './password.decorator';

// Tokens are 43 base64url characters; the bound only stops huge input.
const TOKEN_MAX_LENGTH = 128;

const IsMailedToken = (): PropertyDecorator =>
  applyDecorators(
    ApiProperty({
      description: 'The `token` query parameter of the mailed link',
    }),
    IsString({ message: i18nValidationMessage('validation.IS_STRING') }),
    IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') }),
    MaxLength(TOKEN_MAX_LENGTH, {
      message: i18nValidationMessage('validation.MAX_LENGTH'),
    }),
  );

export class VerifyEmailDto {
  @IsMailedToken()
  token: string;
}

export class ResetPasswordDto {
  @IsMailedToken()
  token: string;

  @ApiProperty({
    example: 'NewSecret123',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @IsNewPassword()
  newPassword: string;
}
