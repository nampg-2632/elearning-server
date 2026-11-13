import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import {
  Inject,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { Job } from 'bullmq';
import type { Transporter } from 'nodemailer';
import { describeError } from '../common/utils/describe-error';
import { mailConfig } from '../config/mail.config';
import { MailRenderer } from './mail-renderer';
import { MAIL_QUEUE, MAIL_TRANSPORT } from './mail.constants';
import type { MailJob } from './mail.types';

// One mail at a time: volumes are small and SMTP hosts throttle bursts.
@Processor(MAIL_QUEUE, { concurrency: 1 })
export class MailProcessor
  extends WorkerHost
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(MailProcessor.name);

  constructor(
    private readonly renderer: MailRenderer,
    @Inject(MAIL_TRANSPORT) private readonly transport: Transporter,
    @Inject(mailConfig.KEY)
    private readonly config: ConfigType<typeof mailConfig>,
  ) {
    super();
  }

  // Only reports: a mail server that is down must not stop the API, and
  // queued mails are retried once it is back.
  onApplicationBootstrap(): void {
    const target = `${this.config.host}:${this.config.port}`;
    this.transport.verify().then(
      () => this.logger.log(`SMTP server ${target} is reachable`),
      (error: Error) =>
        this.logger.warn(
          `SMTP server ${target} check failed: ${describeError(error)}`,
        ),
    );
  }

  onApplicationShutdown(): void {
    this.transport.close();
  }

  async process(job: Job<MailJob>): Promise<void> {
    const { subject, html, text } = this.renderer.render(job.data);
    const info = (await this.transport.sendMail({
      from: this.config.from,
      to: job.data.to,
      subject,
      html,
      text,
    })) as { messageId: string; response: string };
    this.logger.log(
      `Sent ${job.data.template} (job ${job.id}) as ${info.messageId}: ${info.response}`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<MailJob> | undefined, error: Error): void {
    if (!job) {
      return;
    }
    const attempts = job.opts.attempts ?? 1;
    const final = job.attemptsMade >= attempts;
    const message = `${job.data.template} (job ${job.id}) failed, attempt ${job.attemptsMade}/${attempts}: ${describeError(error)}`;
    if (final) {
      this.logger.error(`${message}; giving up`);
    } else {
      this.logger.warn(message);
    }
  }
}
