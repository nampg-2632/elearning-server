import type { Job } from 'bullmq';
import type { Transporter } from 'nodemailer';
import { MailTemplate } from './enums/mail-template.enum';
import { MailRenderer } from './mail-renderer';
import { MailProcessor } from './mail.processor';
import type { MailJob } from './mail.types';

describe('MailProcessor', () => {
  const config = {
    host: 'smtp.example.com',
    port: 465,
    secure: true,
    user: undefined,
    password: undefined,
    from: '"e-Learning" <no-reply@example.com>',
    ratePerHour: 0,
  };
  let transport: { sendMail: jest.Mock; verify: jest.Mock; close: jest.Mock };
  let processor: MailProcessor;

  const job = (data: MailJob) =>
    ({ id: '7', data, opts: { attempts: 4 } }) as unknown as Job<MailJob>;

  beforeEach(() => {
    transport = {
      sendMail: jest.fn().mockResolvedValue({
        messageId: '<1@example.com>',
        response: '250 OK',
      }),
      verify: jest.fn(),
      close: jest.fn(),
    };
    processor = new MailProcessor(
      new MailRenderer(),
      transport as unknown as Transporter,
      config,
    );
  });

  it('renders the template and sends it from MAIL_FROM', async () => {
    await processor.process(
      job({
        to: 'nam@example.com',
        template: MailTemplate.CourseRevoked,
        context: { fullName: 'Nam', courseName: 'TOEIC 600', reason: 'Spam' },
      }),
    );

    expect(transport.sendMail).toHaveBeenCalledTimes(1);
    const [message] = transport.sendMail.mock.calls[0] as [
      Record<string, string>,
    ];
    expect(message).toMatchObject({
      from: config.from,
      to: 'nam@example.com',
      subject: 'Quyền truy cập khoá học đã bị thu hồi / Course access revoked',
    });
    expect(message.html).toContain('Reason: Spam');
    expect(message.text).toContain('Lý do: Spam');
  });

  it('lets a send error through so BullMQ retries the job', async () => {
    transport.sendMail.mockRejectedValue(new Error('421 too many messages'));

    await expect(
      processor.process(
        job({
          to: 'nam@example.com',
          template: MailTemplate.CourseApproved,
          context: { fullName: 'Nam', courseName: 'TOEIC 600' },
        }),
      ),
    ).rejects.toThrow('421 too many messages');
  });
});
