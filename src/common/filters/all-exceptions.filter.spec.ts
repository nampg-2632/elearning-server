import {
  ArgumentsHost,
  HttpStatus,
  NotFoundException,
  ValidationError,
} from '@nestjs/common';
import { I18nContext, I18nValidationException } from 'nestjs-i18n';
import { AppException } from '../exceptions/app.exception';
import { AllExceptionsFilter } from './all-exceptions.filter';

function createHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ url: '/api/v1/courses', method: 'GET' }),
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  beforeEach(() => {
    // Echo the key (and the property, when given) instead of translating.
    jest.spyOn(I18nContext, 'current').mockReturnValue({
      t: (key: string, options?: { args?: { property?: string } }) =>
        options?.args?.property ? `${key}:${options.args.property}` : key,
    } as unknown as ReturnType<typeof I18nContext.current>);
  });

  afterEach(() => jest.restoreAllMocks());

  it('formats AppException with its code and translated key', () => {
    const { host, status, json } = createHost();

    filter.catch(
      new AppException({
        code: 'COURSE_NOT_FOUND',
        messageKey: 'errors.COURSE_NOT_FOUND',
        status: HttpStatus.NOT_FOUND,
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        code: 'COURSE_NOT_FOUND',
        message: 'errors.COURSE_NOT_FOUND',
        path: '/api/v1/courses',
      }),
    );
  });

  it('maps a built-in HttpException status to a generic code', () => {
    const { host, json } = createHost();

    filter.catch(new NotFoundException(), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'errors.NOT_FOUND',
      }),
    );
  });

  it('returns 422 with translated field errors for validation failures', () => {
    const { host, status, json } = createHost();
    const errors: ValidationError[] = [
      {
        property: 'email',
        constraints: {
          isEmail: 'validation.IS_EMAIL|{"value":"x","constraints":[]}',
        },
        children: [],
      },
      {
        property: 'hacker',
        constraints: {
          whitelistValidation: 'property hacker should not exist',
        },
        children: [],
      },
    ];

    filter.catch(new I18nValidationException(errors), host);

    expect(status).toHaveBeenCalledWith(422);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_FAILED',
        message: 'errors.VALIDATION_FAILED',
        errors: [
          { field: 'email', messages: ['validation.IS_EMAIL:email'] },
          {
            field: 'hacker',
            messages: ['validation.PROPERTY_NOT_ALLOWED:hacker'],
          },
        ],
      }),
    );
  });

  it('uses dotted paths for nested validation errors', () => {
    const { host, json } = createHost();
    const errors: ValidationError[] = [
      {
        property: 'answers',
        children: [
          {
            property: '0',
            children: [
              {
                property: 'optionId',
                constraints: {
                  isUuid: 'validation.IS_UUID|{"value":1,"constraints":[]}',
                },
                children: [],
              },
            ],
          },
        ],
      },
    ];

    filter.catch(new I18nValidationException(errors), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: [
          {
            field: 'answers.0.optionId',
            messages: ['validation.IS_UUID:optionId'],
          },
        ],
      }),
    );
  });

  it('hides unknown errors behind a 500 and logs them', () => {
    const { host, status, json } = createHost();
    const logError = jest
      .spyOn(filter['logger'], 'error')
      .mockImplementation(() => undefined);

    filter.catch(new Error('db exploded'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'errors.INTERNAL_SERVER_ERROR',
      }),
    );
    expect(logError).toHaveBeenCalled();
  });
});
