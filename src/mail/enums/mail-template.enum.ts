// Each value names the files templates/<value>.html.hbs and .text.hbs.
export enum MailTemplate {
  VerifyEmail = 'verify-email',
  ResetPassword = 'reset-password',
  PasswordChanged = 'password-changed',
  CourseApproved = 'course-approved',
  CourseRejected = 'course-rejected',
  CourseRevoked = 'course-revoked',
}
