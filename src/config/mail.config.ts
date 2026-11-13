import { registerAs } from '@nestjs/config';

// SMTP server the app hands mail to. The app always speaks SMTP; which server
// that is decides how mail leaves:
//   - development: Mailpit, which keeps every mail (web UI on :8025);
//   - production relay: the SMTP server of a mail host, with a login;
//   - production direct: the Postfix container on the VPS (compose profile
//     `mta`), which signs with DKIM and delivers to the recipient's MX.
export const mailConfig = registerAs('mail', () => ({
  host: process.env.MAIL_HOST ?? 'localhost',
  port: Number(process.env.MAIL_PORT ?? 1025),
  // true = TLS from the start (port 465); false = STARTTLS when the server
  // offers it (587, or plain SMTP for Mailpit and the internal Postfix).
  secure: process.env.MAIL_SECURE === 'true',
  user: process.env.MAIL_USER || undefined,
  password: process.env.MAIL_PASSWORD || undefined,
  from: process.env.MAIL_FROM ?? 'e-Learning <no-reply@localhost>',
  // Mails sent per hour across every app instance; 0 = no limit.
  ratePerHour: Number(process.env.MAIL_RATE_PER_HOUR ?? 0),
}));
