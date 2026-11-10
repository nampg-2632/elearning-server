import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { trimString } from '../../common/utils/transforms';
import {
  USER_AVATAR_URL_MAX_LENGTH,
  USER_FULL_NAME_MAX_LENGTH,
} from '../users.constants';

// Partial update. Email and role cannot be changed here; sending them is
// rejected by forbidNonWhitelisted.
export class UpdateProfileDto {
  // Optional, but cannot be cleared with null.
  @ApiPropertyOptional({
    example: 'Phạm Giang Nam',
    maxLength: USER_FULL_NAME_MAX_LENGTH,
  })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(trimString)
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MaxLength(USER_FULL_NAME_MAX_LENGTH, {
    message: i18nValidationMessage('validation.MAX_LENGTH'),
  })
  fullName?: string;

  // null clears the avatar.
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'https://example.com/avatar.png',
    maxLength: USER_AVATAR_URL_MAX_LENGTH,
  })
  @IsOptional()
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: i18nValidationMessage('validation.IS_URL') },
  )
  @MaxLength(USER_AVATAR_URL_MAX_LENGTH, {
    message: i18nValidationMessage('validation.MAX_LENGTH'),
  })
  avatarUrl?: string | null;
}
