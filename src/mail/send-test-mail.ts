// Sends one mail straight through the configured SMTP server (no queue) and
// prints the server's answer, to check a mail setup end to end:
//   yarn mail:test you@example.com                         (local, .env)
//   docker compose -f docker-compose.prod.yml run --rm --no-deps app \
//     yarn mail:test:prod you@example.com                  (VPS)
import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { describeError } from '../common/utils/describe-error';
import { mailConfig } from '../config/mail.config';
import { createMailTransport } from './mail-transport';

const logger = new Logger('MailTest');

async function main(): Promise<void> {
  const to = process.argv[2];
  if (!to) {
    throw new Error('usage: mail:test <recipient>');
  }

  const config = mailConfig();
  const transport = createMailTransport(config);
  try {
    logger.log(`SMTP ${config.host}:${config.port} (secure=${config.secure})`);
    await transport.verify();
    const info = (await transport.sendMail({
      from: config.from,
      to,
      subject: 'e-Learning: mail thử / test mail',
      text: [
        'Mail thử từ e-Learning. Cấu hình gửi mail đang hoạt động.',
        '',
        'Test mail from e-Learning. Mail delivery is working.',
        '',
        `Sent at ${new Date().toISOString()} via ${config.host}:${config.port}`,
      ].join('\n'),
    })) as { messageId: string; response: string };
    logger.log(`Accepted as ${info.messageId}: ${info.response}`);
  } finally {
    transport.close();
  }
}

main().catch((error: unknown) => {
  logger.error(`Mail test failed: ${describeError(error)}`);
  process.exit(1);
});
