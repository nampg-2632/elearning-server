import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-code.enum';

export type AppExceptionOptions = {
  code: ErrorCode | string;
  // i18n key, e.g. 'errors.COURSE_NOT_FOUND'
  messageKey: string;
  args?: Record<string, unknown>;
  status?: HttpStatus;
};

// Domain errors thrown from services. AllExceptionsFilter translates
// `messageKey` into the request language.
export class AppException extends HttpException {
  readonly code: string;
  readonly messageKey: string;
  readonly args?: Record<string, unknown>;

  constructor({
    code,
    messageKey,
    args,
    status = HttpStatus.BAD_REQUEST,
  }: AppExceptionOptions) {
    super(messageKey, status);
    this.code = code;
    this.messageKey = messageKey;
    this.args = args;
  }
}
