import { HttpStatus } from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/exceptions/error-code.enum';

export const lessonNotFound = (): AppException =>
  new AppException({
    code: ErrorCode.LessonNotFound,
    messageKey: 'errors.LESSON_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
  });
