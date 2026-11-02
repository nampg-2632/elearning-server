import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/exceptions/error-code.enum';
import { EnrollmentDto, EnrollmentSummaryDto } from './dto/enrollment.dto';
import { UserCourse } from './entities/user-course.entity';
import { EnrollmentStatus } from './enums/enrollment-status.enum';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(UserCourse)
    private readonly userCourses: Repository<UserCourse>,
  ) {}

  // Creates a pending enrollment, or moves a rejected one back to pending.
  // The caller checks that the course exists. Both writes are single
  // conditional statements, so concurrent requests cannot both succeed.
  async enroll(userId: string, courseId: string): Promise<EnrollmentDto> {
    const inserted = await this.userCourses
      .createQueryBuilder()
      .insert()
      .into(UserCourse)
      .values({ userId, courseId, status: EnrollmentStatus.Pending })
      .orIgnore()
      .execute();

    // `identifiers` is filled even when the insert is ignored; RETURNING
    // rows are only there for an inserted row.
    if ((inserted.raw as unknown[]).length === 0) {
      const reopened = await this.userCourses.update(
        { userId, courseId, status: EnrollmentStatus.Rejected },
        {
          status: EnrollmentStatus.Pending,
          reviewedBy: null,
          reviewedAt: null,
          rejectReason: null,
        },
      );
      if (!reopened.affected) {
        throw new AppException({
          code: ErrorCode.AlreadyEnrolled,
          messageKey: 'errors.ALREADY_ENROLLED',
          status: HttpStatus.CONFLICT,
        });
      }
    }

    const userCourse = await this.userCourses.findOneByOrFail({
      userId,
      courseId,
    });
    return {
      id: userCourse.id,
      courseId: userCourse.courseId,
      status: userCourse.status,
      createdAt: userCourse.createdAt,
    };
  }

  // The user's enrollment for each course id that has one.
  async findForCourses(
    userId: string,
    courseIds: string[],
  ): Promise<Map<string, EnrollmentSummaryDto>> {
    if (courseIds.length === 0) {
      return new Map();
    }
    const userCourses = await this.userCourses.findBy({
      userId,
      courseId: In(courseIds),
    });
    return new Map(
      userCourses.map(({ id, courseId, status }) => [courseId, { id, status }]),
    );
  }
}
