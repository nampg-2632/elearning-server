import type { ConfigType } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { mailConfig } from '../config/mail.config';

// One pooled SMTP connection, reused across mails. Timeouts keep a dead
// server from holding a job (and the worker) for minutes.
export const createMailTransport = (
  config: ConfigType<typeof mailConfig>,
): Transporter =>
  createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth:
      config.user && config.password
        ? { user: config.user, pass: config.password }
        : undefined,
    pool: true,
    maxConnections: 1,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });
