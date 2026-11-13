import { MailTemplate } from './enums/mail-template.enum';

interface WelcomeContext {
  fullName: string;
  email: string;
}

interface EnrollmentContext {
  fullName: string;
  courseName: string;
}

interface EnrollmentDeclinedContext extends EnrollmentContext {
  reason: string | null;
}

// Variables each template reads.
export interface MailContexts {
  [MailTemplate.Welcome]: WelcomeContext;
  [MailTemplate.CourseApproved]: EnrollmentContext;
  [MailTemplate.CourseRejected]: EnrollmentDeclinedContext;
  [MailTemplate.CourseRevoked]: EnrollmentDeclinedContext;
}

// Payload of a job on the mail queue. Only data goes in: the mail is
// rendered when sent, so a template fix also applies to queued jobs.
export type MailJob = {
  [T in MailTemplate]: { to: string; template: T; context: MailContexts[T] };
}[MailTemplate];

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}
