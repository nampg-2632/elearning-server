import type { Queue } from 'bullmq';
import { MailTemplate } from './enums/mail-template.enum';
import { MAIL_ENQUEUE_TIMEOUT_MS } from './mail.constants';
import { MailService } from './mail.service';
import type { MailJob } from './mail.types';

describe('MailService', () => {
  const job: MailJob = {
    to: 'nam@example.com',
    template: MailTemplate.CourseApproved,
    context: { fullName: 'Nam', courseName: 'TOEIC 600' },
  };
  let queue: {
    add: jest.Mock;
    setGlobalRateLimit: jest.Mock;
    removeGlobalRateLimit: jest.Mock;
  };
  const create = (ratePerHour = 0) =>
    new MailService(queue as unknown as Queue<MailJob>, {
      host: 'localhost',
      port: 1025,
      secure: false,
      user: undefined,
      password: undefined,
      from: 'no-reply@localhost',
      ratePerHour,
    });

  beforeEach(() => {
    queue = {
      add: jest.fn().mockResolvedValue({}),
      setGlobalRateLimit: jest.fn().mockResolvedValue(1),
      removeGlobalRateLimit: jest.fn().mockResolvedValue(1),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('queues the job under the template name', async () => {
    await create().send(job);

    expect(queue.add).toHaveBeenCalledWith(MailTemplate.CourseApproved, job);
  });

  it('does not throw when the job cannot be queued', async () => {
    queue.add.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(create().send(job)).resolves.toBeUndefined();
  });

  it('stops waiting when Redis does not answer', async () => {
    jest.useFakeTimers();
    queue.add.mockReturnValue(new Promise(() => {}));

    const sent = create().send(job);
    await jest.advanceTimersByTimeAsync(MAIL_ENQUEUE_TIMEOUT_MS);

    await expect(sent).resolves.toBeUndefined();
  });

  it('sets the hourly limit, or removes it when 0', async () => {
    await create(50).onModuleInit();
    expect(queue.setGlobalRateLimit).toHaveBeenCalledWith(50, 3_600_000);

    await create(0).onModuleInit();
    expect(queue.removeGlobalRateLimit).toHaveBeenCalled();
  });
});
