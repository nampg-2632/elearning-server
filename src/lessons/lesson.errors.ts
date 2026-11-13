import { HttpStatus } from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/exceptions/error-code.enum';

export const lessonNotFound = (): AppException =>
  new AppException({
    code: ErrorCode.LessonNotFound,
    messageKey: 'errors.LESSON_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
  });

// The lesson still belongs to a course that is not deleted.
export const lessonInUse = (): AppException =>
  new AppException({
    code: ErrorCode.LessonInUse,
    messageKey: 'errors.LESSON_IN_USE',
    status: HttpStatus.CONFLICT,
  });
