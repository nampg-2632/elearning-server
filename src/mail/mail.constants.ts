import type { DefaultJobOptions } from 'bullmq';
import { join } from 'node:path';
import {
  ONE_DAY_MS,
  ONE_HOUR_MS,
  ONE_MINUTE_MS,
} from '../common/constants/date.constants';
import { MailTemplate } from './enums/mail-template.enum';

export const MAIL_QUEUE = 'mail';
export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');

// templates/<MailTemplate>.html.hbs and .text.hbs, copied next to the
// compiled code by nest-cli.json.
export const MAIL_TEMPLATE_DIR = join(__dirname, 'templates');

// How long a request waits for the job to reach Redis before giving up.
export const MAIL_ENQUEUE_TIMEOUT_MS = 2000;

export const MAIL_RATE_LIMIT_WINDOW_MS = ONE_HOUR_MS;

// 1 try + 3 retries, 1, 2 then 4 minutes apart. Done jobs are kept a day for
// debugging, failed ones a week.
export const MAIL_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 4,
  backoff: { type: 'exponential', delay: ONE_MINUTE_MS },
  // BullMQ takes these ages in seconds.
  removeOnComplete: { age: ONE_DAY_MS / 1000, count: 1000 },
  removeOnFail: { age: (7 * ONE_DAY_MS) / 1000 },
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
