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
  CourseNotApproved = 'COURSE_NOT_APPROVED',
  LessonNotAccessible = 'LESSON_NOT_ACCESSIBLE',
  LessonInUse = 'LESSON_IN_USE',

  // Words
  WordNotFound = 'WORD_NOT_FOUND',

  // Enrollments
  AlreadyEnrolled = 'ALREADY_ENROLLED',
  UserCourseNotFound = 'USER_COURSE_NOT_FOUND',
  InvalidEnrollmentStatus = 'INVALID_ENROLLMENT_STATUS',

  // Tests
  TestNotFound = 'TEST_NOT_FOUND',
  AttemptNotFound = 'ATTEMPT_NOT_FOUND',
  AttemptAlreadySubmitted = 'ATTEMPT_ALREADY_SUBMITTED',
  InvalidAnswer = 'INVALID_ANSWER',
}
