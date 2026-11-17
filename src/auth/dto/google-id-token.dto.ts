import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { GOOGLE_ID_TOKEN_MAX_LENGTH } from '../auth.constants';

export class GoogleIdTokenDto {
  @ApiProperty({
    description:
      'The `credential` (an ID token) that Sign in with Google returns to the frontend',
  })
  @IsJWT({ message: i18nValidationMessage('validation.IS_JWT') })
  @MaxLength(GOOGLE_ID_TOKEN_MAX_LENGTH, {
    message: i18nValidationMessage('validation.MAX_LENGTH'),
  })
  idToken: string;
}
