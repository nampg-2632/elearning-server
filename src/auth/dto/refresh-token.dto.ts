import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { REFRESH_TOKEN_MAX_LENGTH } from '../auth.constants';

export class RefreshTokenDto {
  @ApiProperty({ description: 'The refreshToken of the last auth response' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MaxLength(REFRESH_TOKEN_MAX_LENGTH, {
    message: i18nValidationMessage('validation.MAX_LENGTH'),
  })
  refreshToken: string;
}
