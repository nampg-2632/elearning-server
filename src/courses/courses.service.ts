import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, Paginated } from '../common/dto/paginated-response';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/exceptions/error-code.enum';
import { containsPattern } from '../common/utils/sql';
import { EnrollmentDto } from '../enrollments/dto/enrollment.dto';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { UserCourse } from '../enrollments/entities/user-course.entity';
import { EnrollmentStatus } from '../enrollments/enums/enrollment-status.enum';
import { ProgressService } from '../progress/progress.service';
import type { User } from '../users/entities/user.entity';
import { countCourseLessons } from './course-lesson-count.query';
import { CourseDetailDto, CourseDto } from './dto/course.dto';
import { ListCoursesQueryDto } from './dto/list-courses-query.dto';
import { ListMyCoursesQueryDto } from './dto/list-my-courses-query.dto';
import { Course } from './entities/course.entity';

// Course catalogue and enrollment for learners. Soft-deleted courses are
// excluded by TypeORM, including on the join from user_courses.
@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    private readonly enrollmentsService: EnrollmentsService,
    private readonly progressService: ProgressService,
  ) {}

  async list(
    user: User,
    query: ListCoursesQueryDto,
  ): Promise<Paginated<CourseDto>> {
    const qb = this.courses.createQueryBuilder('course');
    if (query.keyword) {
      qb.where('course.name ILIKE :keyword', {
        keyword: containsPattern(query.keyword),
      });
    }
    const [courses, total] = await qb
      .orderBy('course.createdAt', 'DESC')
      .addOrderBy('course.id', 'ASC')
      .offset(query.offset)
      .limit(query.limit)
      .getManyAndCount();

    const ids = courses.map((course) => course.id);
    const [lessonCounts, enrollments] = await Promise.all([
      countCourseLessons(this.courses.manager, ids),
      this.enrollmentsService.findForCourses(user.id, ids),
    ]);
    const items = courses.map((course) =>
      this.toDto(
        course,
        lessonCounts.get(course.id)!,
        enrollments.get(course.id) ?? null,
      ),
    );
    return paginate(items, total, query);
  }

  async findOne(user: User, id: string): Promise<CourseDetailDto> {
    const course = await this.findCourse(id);
    const [lessonCounts, enrollments] = await Promise.all([
      countCourseLessons(this.courses.manager, [id]),
      this.enrollmentsService.findForCourses(user.id, [id]),
    ]);
    const enrollment = enrollments.get(id) ?? null;
    const progress =
      enrollment?.status === EnrollmentStatus.Approved
        ? (await this.progressService.summarize(user.id, [id])).get(id)!
        : null;
    return {
      ...this.toDto(course, lessonCounts.get(id)!, enrollment),
      progress,
    };
  }

  async enroll(user: User, id: string): Promise<EnrollmentDto> {
    await this.findCourse(id);
    return this.enrollmentsService.enroll(user.id, id);
  }

  async listMine(
    user: User,
    query: ListMyCoursesQueryDto,
  ): Promise<Paginated<CourseDetailDto>> {
    const qb = this.courses.manager
      .createQueryBuilder(UserCourse, 'uc')
      .innerJoinAndSelect('uc.course', 'course')
      .where('uc.userId = :userId', { userId: user.id });
    if (query.status) {
      qb.andWhere('uc.status = :status', { status: query.status });
    }
    const [userCourses, total] = await qb
      .orderBy('uc.createdAt', 'DESC')
      .addOrderBy('uc.id', 'ASC')
      .offset(query.offset)
      .limit(query.limit)
      .getManyAndCount();

    const approvedIds = userCourses
      .filter((uc) => uc.status === EnrollmentStatus.Approved)
      .map((uc) => uc.courseId);
    const [lessonCounts, progress] = await Promise.all([
      countCourseLessons(
        this.courses.manager,
        userCourses.map((uc) => uc.courseId),
      ),
      this.progressService.summarize(user.id, approvedIds),
    ]);
    const items = userCourses.map((uc) => ({
      ...this.toDto(uc.course!, lessonCounts.get(uc.courseId)!, {
        id: uc.id,
        status: uc.status,
      }),
      progress: progress.get(uc.courseId) ?? null,
    }));
    return paginate(items, total, query);
  }

  private async findCourse(id: string): Promise<Course> {
    const course = await this.courses.findOneBy({ id });
    if (!course) {
      throw new AppException({
        code: ErrorCode.CourseNotFound,
        messageKey: 'errors.COURSE_NOT_FOUND',
        status: HttpStatus.NOT_FOUND,
      });
    }
    return course;
  }

  private toDto(
    course: Course,
    lessonCount: number,
    enrollment: CourseDto['enrollment'],
  ): CourseDto {
    return {
      id: course.id,
      name: course.name,
      description: course.description,
      thumbnailUrl: course.thumbnailUrl,
      lessonCount,
      enrollment,
      createdAt: course.createdAt,
    };
  }
}
