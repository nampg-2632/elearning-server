import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { EnrollmentStatus } from '../../enrollments/enums/enrollment-status.enum';

export class ListMyCoursesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: EnrollmentStatus, enumName: 'EnrollmentStatus' })
  @IsOptional()
  @IsEnum(EnrollmentStatus, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  status?: EnrollmentStatus;
}
