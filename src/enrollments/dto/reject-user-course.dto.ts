import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { trimString } from '../../common/utils/transforms';
import { REJECT_REASON_MAX_LENGTH } from '../enrollments.constants';

export class RejectUserCourseDto {
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Khoá học đã đủ học viên',
    maxLength: REJECT_REASON_MAX_LENGTH,
  })
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MaxLength(REJECT_REASON_MAX_LENGTH, {
    message: i18nValidationMessage('validation.MAX_LENGTH'),
  })
  reason?: string | null;
}
