import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { paginate, Paginated } from '../common/dto/paginated-response';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/exceptions/error-code.enum';
import { containsPattern } from '../common/utils/sql';
import type { User } from '../users/entities/user.entity';
import { AdminUserCourseDto } from './dto/admin-user-course.dto';
import { ListUserCoursesQueryDto } from './dto/list-user-courses-query.dto';
import {
  APPROVABLE_STATUSES,
  REJECTABLE_STATUSES,
  USER_COURSE_SORT_ORDER,
} from './enrollments.constants';
import { UserCourse } from './entities/user-course.entity';
import { EnrollmentStatus } from './enums/enrollment-status.enum';

type ReviewChanges = Pick<
  UserCourse,
  'status' | 'reviewedBy' | 'reviewedAt' | 'rejectReason'
>;

// Enrollments of soft-deleted courses are hidden and cannot be reviewed:
// TypeORM adds `deleted_at IS NULL` to the inner join on course.
@Injectable()
export class AdminUserCoursesService {
  constructor(
    @InjectRepository(UserCourse)
    private readonly userCourses: Repository<UserCourse>,
  ) {}

  async list(
    query: ListUserCoursesQueryDto,
  ): Promise<Paginated<AdminUserCourseDto>> {
    const qb = this.itemQuery();
    if (query.status) {
      qb.andWhere('uc.status = :status', { status: query.status });
    }
    if (query.courseId) {
      qb.andWhere('uc.courseId = :courseId', { courseId: query.courseId });
    }
    if (query.keyword) {
      qb.andWhere(
        '(student.fullName ILIKE :keyword OR student.email ILIKE :keyword)',
        { keyword: containsPattern(query.keyword) },
      );
    }

    const [sortColumn, sortDirection] = USER_COURSE_SORT_ORDER[query.sort];
    // Every join is many-to-one, so offset/limit is safe.
    const [userCourses, total] = await qb
      .orderBy(sortColumn, sortDirection)
      .addOrderBy('uc.id', 'ASC')
      .offset(query.offset)
      .limit(query.limit)
      .getManyAndCount();

    return paginate(userCourses.map(this.toDto), total, query);
  }

  approve(id: string, admin: User): Promise<AdminUserCourseDto> {
    return this.review(id, APPROVABLE_STATUSES, {
      status: EnrollmentStatus.Approved,
      reviewedBy: admin.id,
      reviewedAt: new Date(),
      rejectReason: null,
    });
  }

  // From pending this rejects the request; from approved it revokes access.
  // Lesson progress is kept either way.
  reject(
    id: string,
    admin: User,
    reason?: string | null,
  ): Promise<AdminUserCourseDto> {
    return this.review(id, REJECTABLE_STATUSES, {
      status: EnrollmentStatus.Rejected,
      reviewedBy: admin.id,
      reviewedAt: new Date(),
      rejectReason: reason || null,
    });
  }

  private async review(
    id: string,
    allowedFrom: EnrollmentStatus[],
    changes: ReviewChanges,
  ): Promise<AdminUserCourseDto> {
    await this.userCourses.manager.transaction(async (manager) => {
      // Row lock so two admins reviewing the same enrollment are applied
      // one after the other and the second sees the new status.
      const userCourse = await manager
        .createQueryBuilder(UserCourse, 'uc')
        .innerJoin('uc.course', 'course')
        .where('uc.id = :id', { id })
        .setLock('pessimistic_write', undefined, ['uc'])
        .getOne();
      if (!userCourse) {
        throw this.userCourseNotFound();
      }
      if (!allowedFrom.includes(userCourse.status)) {
        throw new AppException({
          code: ErrorCode.InvalidEnrollmentStatus,
          messageKey: 'errors.INVALID_ENROLLMENT_STATUS',
          status: HttpStatus.CONFLICT,
        });
      }
      await manager.update(UserCourse, { id }, changes);
    });

    const userCourse = await this.itemQuery()
      .where('uc.id = :id', { id })
      .getOneOrFail();
    return this.toDto(userCourse);
  }

  private itemQuery(): SelectQueryBuilder<UserCourse> {
    return this.userCourses
      .createQueryBuilder('uc')
      .innerJoinAndSelect('uc.user', 'student')
      .innerJoinAndSelect('uc.course', 'course')
      .leftJoinAndSelect('uc.reviewer', 'reviewer');
  }

  private toDto(this: void, userCourse: UserCourse): AdminUserCourseDto {
    const { user, course, reviewer } = userCourse;
    return {
      id: userCourse.id,
      status: userCourse.status,
      user: { id: user!.id, fullName: user!.fullName, email: user!.email },
      course: { id: course!.id, name: course!.name },
      reviewedBy: reviewer
        ? { id: reviewer.id, fullName: reviewer.fullName }
        : null,
      reviewedAt: userCourse.reviewedAt,
      rejectReason: userCourse.rejectReason,
      createdAt: userCourse.createdAt,
    };
  }

  private userCourseNotFound(): AppException {
    return new AppException({
      code: ErrorCode.UserCourseNotFound,
      messageKey: 'errors.USER_COURSE_NOT_FOUND',
      status: HttpStatus.NOT_FOUND,
    });
  }
}
