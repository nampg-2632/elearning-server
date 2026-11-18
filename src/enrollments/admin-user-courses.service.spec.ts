import { HttpStatus } from '@nestjs/common';
import type { EntityManager, Repository } from 'typeorm';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/exceptions/error-code.enum';
import { MailTemplate } from '../mail/enums/mail-template.enum';
import type { MailService } from '../mail/mail.service';
import type { User } from '../users/entities/user.entity';
import { AdminUserCoursesService } from './admin-user-courses.service';
import { UserCourse } from './entities/user-course.entity';
import { EnrollmentStatus } from './enums/enrollment-status.enum';

describe('AdminUserCoursesService', () => {
  const admin = { id: 'admin-1' } as User;
  let service: AdminUserCoursesService;
  let mail: { send: jest.Mock };
  let lockedStatus: EnrollmentStatus;
  let manager: { createQueryBuilder: jest.Mock; update: jest.Mock };
  let reviewed: Partial<UserCourse>;

  // Chainable query builder mock; only the terminal calls matter.
  const queryBuilder = (terminal: Record<string, jest.Mock>) => {
    const qb: Record<string, jest.Mock> = { ...terminal };
    for (const method of [
      'innerJoin',
      'innerJoinAndSelect',
      'leftJoinAndSelect',
      'where',
      'setLock',
    ]) {
      qb[method] = jest.fn(() => qb);
    }
    return qb;
  };

  beforeEach(() => {
    lockedStatus = EnrollmentStatus.Pending;
    mail = { send: jest.fn().mockResolvedValue(undefined) };
    manager = {
      createQueryBuilder: jest.fn(() =>
        queryBuilder({
          getOne: jest.fn(() =>
            Promise.resolve({ id: 'uc-1', status: lockedStatus }),
          ),
        }),
      ),
      update: jest.fn((_entity, _where, changes: Partial<UserCourse>) => {
        reviewed = { ...reviewed, ...changes };
        return Promise.resolve();
      }),
    };
    reviewed = {
      id: 'uc-1',
      user: { id: 'u-1', email: 'nam@example.com', fullName: 'Nam' } as User,
      course: { id: 'c-1', name: 'TOEIC 600' } as UserCourse['course'],
      reviewer: null,
      createdAt: new Date(),
    };
    const userCourses = {
      manager: {
        transaction: jest.fn((run: (m: EntityManager) => Promise<unknown>) =>
          run(manager as unknown as EntityManager),
        ),
      },
      createQueryBuilder: jest.fn(() =>
        queryBuilder({
          getOneOrFail: jest.fn(() => Promise.resolve(reviewed)),
        }),
      ),
    };
    service = new AdminUserCoursesService(
      userCourses as unknown as Repository<UserCourse>,
      mail as unknown as MailService,
    );
  });

  it('mails course-approved after approving', async () => {
    await service.approve('uc-1', admin);

    expect(mail.send).toHaveBeenCalledWith({
      to: 'nam@example.com',
      template: MailTemplate.CourseApproved,
      context: { fullName: 'Nam', courseName: 'TOEIC 600' },
    });
    expect(manager.update.mock.invocationCallOrder[0]).toBeLessThan(
      mail.send.mock.invocationCallOrder[0],
    );
  });

  it('mails course-rejected with the reason when rejecting a request', async () => {
    await service.reject('uc-1', admin, 'Thiếu thông tin');

    expect(mail.send).toHaveBeenCalledWith({
      to: 'nam@example.com',
      template: MailTemplate.CourseRejected,
      context: {
        fullName: 'Nam',
        courseName: 'TOEIC 600',
        reason: 'Thiếu thông tin',
      },
    });
  });

  it('mails course-revoked when rejecting an approved enrollment', async () => {
    lockedStatus = EnrollmentStatus.Approved;

    await service.reject('uc-1', admin);

    expect(mail.send).toHaveBeenCalledWith({
      to: 'nam@example.com',
      template: MailTemplate.CourseRevoked,
      context: { fullName: 'Nam', courseName: 'TOEIC 600', reason: null },
    });
  });

  it('sends no mail when the review is refused', async () => {
    lockedStatus = EnrollmentStatus.Rejected;

    const error: unknown = await service
      .approve('uc-1', admin)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).code).toBe(
      ErrorCode.InvalidEnrollmentStatus,
    );
    expect((error as AppException).getStatus()).toBe(HttpStatus.CONFLICT);
    expect(mail.send).not.toHaveBeenCalled();
  });
});
