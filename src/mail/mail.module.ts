import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { mailConfig } from '../config/mail.config';
import { createMailTransport } from './mail-transport';
import { MailRenderer } from './mail-renderer';
import { MAIL_JOB_OPTIONS, MAIL_QUEUE, MAIL_TRANSPORT } from './mail.constants';
import { MailProcessor } from './mail.processor';
import { MailService } from './mail.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: MAIL_QUEUE,
      defaultJobOptions: MAIL_JOB_OPTIONS,
    }),
  ],
  providers: [
    MailService,
    MailRenderer,
    MailProcessor,
    {
      provide: MAIL_TRANSPORT,
      inject: [mailConfig.KEY],
      useFactory: (config: ConfigType<typeof mailConfig>) =>
        createMailTransport(config),
    },
  ],
  exports: [MailService],
})
export class MailModule {}
