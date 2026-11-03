import { HttpStatus } from '@nestjs/common';
import type { EntityManager, Repository } from 'typeorm';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/exceptions/error-code.enum';
import type { LessonsService } from '../lessons/lessons.service';
import { User } from '../users/entities/user.entity';
import { TestAttempt } from './entities/test-attempt.entity';
import { AttemptStatus } from './enums/attempt-status.enum';
import { TestAttemptsService } from './test-attempts.service';

const user = Object.assign(new User(), { id: 'user-1' });

const buildAttempt = (status: AttemptStatus): TestAttempt =>
  Object.assign(new TestAttempt(), {
    id: 'attempt-1',
    userId: user.id,
    testId: 'test-1',
    status,
    test: { id: 'test-1', lessonId: 'lesson-1', passScore: 80 },
  });

const expectAppError = async (
  promise: Promise<unknown>,
  code: ErrorCode,
  status: HttpStatus,
) => {
  const error: unknown = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppException);
  expect((error as AppException).code).toBe(code);
  expect((error as AppException).getStatus()).toBe(status);
};

describe('TestAttemptsService.submit', () => {
  let service: TestAttemptsService;
  let attempts: { findOne: jest.Mock; manager: { transaction: jest.Mock } };
  let manager: { findOneOrFail: jest.Mock; find: jest.Mock; insert: jest.Mock };
  let lessonsService: { assertAccessible: jest.Mock };

  beforeEach(() => {
    manager = { findOneOrFail: jest.fn(), find: jest.fn(), insert: jest.fn() };
    attempts = {
      findOne: jest.fn(),
      manager: {
        transaction: jest.fn((run: (m: EntityManager) => Promise<unknown>) =>
          run(manager as unknown as EntityManager),
        ),
      },
    };
    lessonsService = { assertAccessible: jest.fn() };
    service = new TestAttemptsService(
      attempts as unknown as Repository<TestAttempt>,
      lessonsService as unknown as LessonsService,
    );
  });

  it('rejects a second submit of the same attempt', async () => {
    attempts.findOne.mockResolvedValue(buildAttempt(AttemptStatus.Doing));
    // The first submit committed while this one waited for the row lock.
    manager.findOneOrFail.mockResolvedValue(
      buildAttempt(AttemptStatus.Submitted),
    );

    await expectAppError(
      service.submit(user, 'attempt-1', { answers: [] }),
      ErrorCode.AttemptAlreadySubmitted,
      HttpStatus.CONFLICT,
    );
    expect(manager.find).not.toHaveBeenCalled();
    expect(manager.insert).not.toHaveBeenCalled();
  });

  it("reports another user's attempt as not found", async () => {
    attempts.findOne.mockResolvedValue(null);

    await expectAppError(
      service.submit(user, 'attempt-1', { answers: [] }),
      ErrorCode.AttemptNotFound,
      HttpStatus.NOT_FOUND,
    );
    expect(attempts.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'attempt-1', userId: user.id } }),
    );
    expect(attempts.manager.transaction).not.toHaveBeenCalled();
  });
});
