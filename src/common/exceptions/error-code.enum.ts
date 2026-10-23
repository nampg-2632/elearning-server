// Stable, machine-readable codes returned in every error body. Clients
// branch on `code`; `message` is translated and may change.
export enum ErrorCode {
  BadRequest = 'BAD_REQUEST',
  ValidationFailed = 'VALIDATION_FAILED',
  Unauthorized = 'UNAUTHORIZED',
  Forbidden = 'FORBIDDEN',
  NotFound = 'NOT_FOUND',
  Conflict = 'CONFLICT',
  TooManyRequests = 'TOO_MANY_REQUESTS',
  InternalServerError = 'INTERNAL_SERVER_ERROR',

  // Auth
  EmailAlreadyExists = 'EMAIL_ALREADY_EXISTS',
  InvalidCredentials = 'INVALID_CREDENTIALS',

  // Courses & lessons
  CourseNotFound = 'COURSE_NOT_FOUND',
  LessonNotFound = 'LESSON_NOT_FOUND',
}
