import { HttpStatus } from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/exceptions/error-code.enum';

export const courseNotFound = (): AppException =>
  new AppException({
    code: ErrorCode.CourseNotFound,
    messageKey: 'errors.COURSE_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
  });
