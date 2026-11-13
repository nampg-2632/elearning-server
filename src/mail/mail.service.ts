import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { describeError } from '../common/utils/describe-error';
import { withTimeout } from '../common/utils/with-timeout';
import { mailConfig } from '../config/mail.config';
import {
  MAIL_ENQUEUE_TIMEOUT_MS,
  MAIL_QUEUE,
  MAIL_RATE_LIMIT_WINDOW_MS,
} from './mail.constants';
import type { MailJob } from './mail.types';

// Puts mails on the queue; MailProcessor renders and sends them. Mail is a
// side effect: send() never throws, so the caller's action still succeeds
// when Redis is down (the failure is logged).
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @InjectQueue(MAIL_QUEUE) private readonly queue: Queue<MailJob>,
    @Inject(mailConfig.KEY)
    private readonly config: ConfigType<typeof mailConfig>,
  ) {}

  // The limit lives in Redis and applies to every worker, so changing
  // MAIL_RATE_PER_HOUR only needs a restart.
  async onModuleInit(): Promise<void> {
    try {
      await withTimeout(
        this.config.ratePerHour > 0
          ? this.queue.setGlobalRateLimit(
              this.config.ratePerHour,
              MAIL_RATE_LIMIT_WINDOW_MS,
            )
          : this.queue.removeGlobalRateLimit(),
        MAIL_ENQUEUE_TIMEOUT_MS,
      );
    } catch (error) {
      this.logger.warn(
        `Cannot set the mail rate limit: ${describeError(error)}`,
      );
    }
  }

  async send(job: MailJob): Promise<void> {
    try {
      await withTimeout(
        this.queue.add(job.template, job),
        MAIL_ENQUEUE_TIMEOUT_MS,
      );
    } catch (error) {
      this.logger.error(
        `Cannot queue mail ${job.template}: ${describeError(error)}`,
      );
    }
  }
}
