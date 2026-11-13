import type { DefaultJobOptions } from 'bullmq';
import { MailTemplate } from './enums/mail-template.enum';

export const MAIL_QUEUE = 'mail';
export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');

// How long a request waits for the job to reach Redis before giving up.
export const MAIL_ENQUEUE_TIMEOUT_MS = 2000;

const HOUR_MS = 60 * 60 * 1000;
export const MAIL_RATE_LIMIT_WINDOW_MS = HOUR_MS;

// 1 try + 3 retries, 1, 2 then 4 minutes apart. Done jobs are kept a day for
// debugging, failed ones a week.
export const MAIL_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 4,
  backoff: { type: 'exponential', delay: 60_000 },
  removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
  removeOnFail: { age: 7 * 24 * 60 * 60 },
};

// Vietnamese first, English second, like the body.
export const MAIL_SUBJECTS: Record<MailTemplate, string> = {
  [MailTemplate.Welcome]:
    'Chào mừng bạn đến với e-Learning / Welcome to e-Learning',
  [MailTemplate.CourseApproved]:
    'Đăng ký khoá học đã được duyệt / Course enrollment approved',
  [MailTemplate.CourseRejected]:
    'Đăng ký khoá học chưa được duyệt / Course enrollment rejected',
  [MailTemplate.CourseRevoked]:
    'Quyền truy cập khoá học đã bị thu hồi / Course access revoked',
};
