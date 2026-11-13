import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export const PASSWORD_MIN_LENGTH = 8;
// argon2 accepts longer input, but 72 keeps the limit the same as bcrypt
// in case the hash ever changes.
export const PASSWORD_MAX_LENGTH = 72;

// Policy for a password the user chooses: 8–72 characters with at least one
// letter and one digit. Not used on login, see LoginDto.
export const IsNewPassword = (): PropertyDecorator =>
  applyDecorators(
    IsString({ message: i18nValidationMessage('validation.IS_STRING') }),
    MinLength(PASSWORD_MIN_LENGTH, {
      message: i18nValidationMessage('validation.MIN_LENGTH'),
    }),
    MaxLength(PASSWORD_MAX_LENGTH, {
      message: i18nValidationMessage('validation.MAX_LENGTH'),
    }),
    Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
      message: i18nValidationMessage('validation.PASSWORD_WEAK'),
    }),
  );
