import { HttpStatus } from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/exceptions/error-code.enum';

export const wordNotFound = (): AppException =>
  new AppException({
    code: ErrorCode.WordNotFound,
    messageKey: 'errors.WORD_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
  });
