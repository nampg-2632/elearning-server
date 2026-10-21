import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  ValidationError,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { I18nContext, I18nValidationException } from 'nestjs-i18n';
import { AppException } from '../exceptions/app.exception';
import { ErrorCode } from '../exceptions/error-code.enum';
import type { ErrorResponse, FieldError } from '../exceptions/error-response';

const STATUS_TO_CODE: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.BadRequest,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.Unauthorized,
  [HttpStatus.FORBIDDEN]: ErrorCode.Forbidden,
  [HttpStatus.NOT_FOUND]: ErrorCode.NotFound,
  [HttpStatus.CONFLICT]: ErrorCode.Conflict,
  [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorCode.ValidationFailed,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.TooManyRequests,
};

// Constraint added by ValidationPipe's forbidNonWhitelisted; its message is
// plain English, so it gets its own translation key.
const WHITELIST_CONSTRAINT = 'whitelistValidation';

type Translate = (key: string, args?: Record<string, unknown>) => string;

// Messages built with i18nValidationMessage() look like
// 'validation.MIN|{"value":0,"constraints":[1]}'. Translations reference
// {property} and {constraints.0}, mirroring nestjs-i18n's formatI18nErrors.
// Messages without a key (plain class-validator defaults) are kept as is.
function translateConstraint(
  message: string,
  property: string,
  t: Translate,
): string {
  const [key, rawArgs] = message.split('|');

  if (!rawArgs) {
    return message;
  }

  try {
    const args = JSON.parse(rawArgs) as Record<string, unknown>;
    const constraints = Array.isArray(args.constraints)
      ? Object.fromEntries(
          args.constraints.map((value: unknown, index) => [
            String(index),
            value,
          ]),
        )
      : {};
    return t(key, { ...args, property, constraints });
  } catch {
    return t(key, { property });
  }
}

function collectFieldErrors(
  errors: ValidationError[],
  t: Translate,
  parentPath = '',
): FieldError[] {
  return errors.flatMap((error) => {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const own: FieldError[] = error.constraints
      ? [
          {
            field,
            messages: Object.entries(error.constraints).map(
              ([constraint, message]) =>
                constraint === WHITELIST_CONSTRAINT
                  ? t('validation.PROPERTY_NOT_ALLOWED', {
                      property: error.property,
                    })
                  : translateConstraint(message, error.property, t),
            ),
          },
        ]
      : [];

    return [...own, ...collectFieldErrors(error.children ?? [], t, field)];
  });
}

// Turns every error into the ErrorResponse shape documented in
// docs/api-spec.md, with `message` translated into the request language.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const i18n = I18nContext.current(host);
    const t: Translate = (key, args) => (i18n ? i18n.t(key, { args }) : key);

    const body: ErrorResponse = {
      ...this.toBody(exception, t),
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (body.statusCode >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(body.statusCode).json(body);
  }

  private toBody(
    exception: unknown,
    t: Translate,
  ): Omit<ErrorResponse, 'path' | 'timestamp'> {
    if (exception instanceof I18nValidationException) {
      return {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        code: ErrorCode.ValidationFailed,
        message: t('errors.VALIDATION_FAILED'),
        errors: collectFieldErrors(exception.errors, t),
      };
    }

    if (exception instanceof AppException) {
      return {
        statusCode: exception.getStatus(),
        code: exception.code,
        message: t(exception.messageKey, exception.args),
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const code = STATUS_TO_CODE[statusCode] ?? ErrorCode.BadRequest;
      return { statusCode, code, message: t(`errors.${code}`) };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.InternalServerError,
      message: t('errors.INTERNAL_SERVER_ERROR'),
    };
  }
}
