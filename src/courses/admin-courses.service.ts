import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { paginate, Paginated } from '../common/dto/paginated-response';
import {
  DATE_ONLY_REGEX,
  ONE_DAY_MS,
} from '../common/constants/date.constants';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/exceptions/error-code.enum';
import { containsPattern } from '../common/utils/sql';
import { UserCourse } from '../enrollments/entities/user-course.entity';
import { EnrollmentStatus } from '../enrollments/enums/enrollment-status.enum';
import { addLessonSummarySelect } from '../lessons/lesson-summary.query';
import { LessonsService } from '../lessons/lessons.service';
import type { User } from '../users/entities/user.entity';
import {
  AdminCourseDetailDto,
  AdminCourseDto,
  CourseLessonDto,
} from './dto/admin-course.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { ListAdminCoursesQueryDto } from './dto/list-admin-courses-query.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { ADMIN_COURSE_SORT_ORDER } from './courses.constants';
import { CourseLesson } from './entities/course-lesson.entity';
import { Course } from './entities/course.entity';

type CourseStats = Pick<
  AdminCourseDto,
  'lessonCount' | 'studentCount' | 'pendingCount'
>;

// Soft-deleted courses are excluded everywhere: TypeORM adds
// `deleted_at IS NULL` to find/query builder calls on Course.
@Injectable()
export class AdminCoursesService {
  constructor(
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    private readonly lessonsService: LessonsService,
  ) {}

  async list(
    query: ListAdminCoursesQueryDto,
  ): Promise<Paginated<AdminCourseDto>> {
    const qb = this.courses
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.creator', 'creator');

    if (query.keyword) {
      qb.andWhere('course.name ILIKE :keyword', {
        keyword: containsPattern(query.keyword),
      });
    }
    if (query.studentName) {
      qb.andWhereExists(
        this.courses.manager
          .createQueryBuilder(UserCourse, 'uc')
          .innerJoin('uc.user', 'u')
          .where('uc.courseId = course.id')
          .andWhere('uc.status IN (:...studentStatuses)', {
            studentStatuses: [
              EnrollmentStatus.Pending,
              EnrollmentStatus.Approved,
            ],
          })
          .andWhere('u.fullName ILIKE :studentName', {
            studentName: containsPattern(query.studentName),
          }),
      );
    }
    if (query.createdFrom) {
      qb.andWhere('course.createdAt >= :createdFrom', {
        createdFrom: new Date(query.createdFrom),
      });
    }
    if (query.createdTo) {
      // A bare date includes the whole day, so compare against the next day.
      const createdTo = new Date(query.createdTo);
      if (DATE_ONLY_REGEX.test(query.createdTo)) {
        qb.andWhere('course.createdAt < :createdToExclusive', {
          createdToExclusive: new Date(createdTo.getTime() + ONE_DAY_MS),
        });
      } else {
        qb.andWhere('course.createdAt <= :createdTo', { createdTo });
      }
    }

    const [sortColumn, sortDirection] = ADMIN_COURSE_SORT_ORDER[query.sort];
    // offset/limit instead of skip/take: the only join is many-to-one, so
    // rows are not multiplied and the simpler SQL is enough.
    const [courses, total] = await qb
      .orderBy(sortColumn, sortDirection)
      .addOrderBy('course.id', 'ASC')
      .offset(query.offset)
      .limit(query.limit)
      .getManyAndCount();

    const stats = await this.loadStats(courses.map((course) => course.id));
    const items = courses.map((course) =>
      this.toDto(course, stats.get(course.id)!),
    );
    return paginate(items, total, query);
  }

  async findOne(id: string): Promise<AdminCourseDetailDto> {
    const course = await this.courses.findOne({
      where: { id },
      relations: { creator: true },
    });
    if (!course) {
      throw this.courseNotFound();
    }

    const [stats, lessons] = await Promise.all([
      this.loadStats([id]),
      this.findLessons(id),
    ]);
    return { ...this.toDto(course, stats.get(id)!), lessons };
  }

  async create(
    dto: CreateCourseDto,
    admin: User,
  ): Promise<AdminCourseDetailDto> {
    const lessonIds = dto.lessonIds ?? [];
    const courseId = await this.courses.manager.transaction(async (manager) => {
      await this.lessonsService.assertExist(lessonIds, manager);
      const course = await manager.save(
        manager.create(Course, {
          name: dto.name,
          description: dto.description ?? null,
          thumbnailUrl: dto.thumbnailUrl ?? null,
          createdBy: admin.id,
        }),
      );
      await this.insertLessons(manager, course.id, lessonIds);
      return course.id;
    });
    return this.findOne(courseId);
  }

  async update(
    id: string,
    dto: UpdateCourseDto,
  ): Promise<AdminCourseDetailDto> {
    const course = await this.courses.findOneBy({ id });
    if (!course) {
      throw this.courseNotFound();
    }
    // undefined = not sent (keep), null = clear.
    if (dto.name !== undefined) course.name = dto.name;
    if (dto.description !== undefined) course.description = dto.description;
    if (dto.thumbnailUrl !== undefined) course.thumbnailUrl = dto.thumbnailUrl;
    await this.courses.save(course);
    return this.findOne(id);
  }

  // Replaces the lesson list. user_lessons is left alone: progress is
  // computed against whatever lessons the course has now.
  async setLessons(
    id: string,
    lessonIds: string[],
  ): Promise<CourseLessonDto[]> {
    await this.courses.manager.transaction(async (manager) => {
      // Row lock serialises concurrent replacements of the same course,
      // which would otherwise collide on the (course_id, position) key.
      const course = await manager.findOne(Course, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!course) {
        throw this.courseNotFound();
      }
      await this.lessonsService.assertExist(lessonIds, manager);
      await manager.delete(CourseLesson, { courseId: id });
      await this.insertLessons(manager, id, lessonIds);
    });
    return this.findLessons(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.courses.softDelete({ id });
    if (!result.affected) {
      throw this.courseNotFound();
    }
  }

  private async insertLessons(
    manager: EntityManager,
    courseId: string,
    lessonIds: string[],
  ): Promise<void> {
    if (lessonIds.length === 0) {
      return;
    }
    await manager.insert(
      CourseLesson,
      lessonIds.map((lessonId, index) => ({
        courseId,
        lessonId,
        position: index + 1,
      })),
    );
  }

  private findLessons(courseId: string): Promise<CourseLessonDto[]> {
    const qb = this.courses.manager
      .createQueryBuilder(CourseLesson, 'cl')
      .innerJoin('cl.lesson', 'lesson')
      .select('lesson.id', 'id')
      .addSelect('lesson.title', 'title')
      .addSelect('cl.position', 'position');
    return addLessonSummarySelect(qb, 'lesson')
      .where('cl.courseId = :courseId', { courseId })
      .orderBy('cl.position', 'ASC')
      .getRawMany<CourseLessonDto>();
  }

  // Counts come from two grouped queries; courses without rows get 0.
  private async loadStats(ids: string[]): Promise<Map<string, CourseStats>> {
    const stats = new Map<string, CourseStats>(
      ids.map((id) => [
        id,
        { lessonCount: 0, studentCount: 0, pendingCount: 0 },
      ]),
    );
    if (ids.length === 0) {
      return stats;
    }

    const manager = this.courses.manager;
    const [lessonRows, enrollmentRows] = await Promise.all([
      manager
        .createQueryBuilder(CourseLesson, 'cl')
        .select('cl.courseId', 'courseId')
        .addSelect('COUNT(*)::int', 'lessonCount')
        .where('cl.courseId IN (:...ids)', { ids })
        .groupBy('cl.courseId')
        .getRawMany<{ courseId: string; lessonCount: number }>(),
      manager
        .createQueryBuilder(UserCourse, 'uc')
        .select('uc.courseId', 'courseId')
        .addSelect(
          '(COUNT(*) FILTER (WHERE uc.status = :approved))::int',
          'studentCount',
        )
        .addSelect(
          '(COUNT(*) FILTER (WHERE uc.status = :pending))::int',
          'pendingCount',
        )
        .where('uc.courseId IN (:...ids)', { ids })
        .setParameters({
          approved: EnrollmentStatus.Approved,
          pending: EnrollmentStatus.Pending,
        })
        .groupBy('uc.courseId')
        .getRawMany<{ courseId: string } & Omit<CourseStats, 'lessonCount'>>(),
    ]);

    for (const { courseId, lessonCount } of lessonRows) {
      stats.get(courseId)!.lessonCount = lessonCount;
    }
    for (const { courseId, ...counts } of enrollmentRows) {
      Object.assign(stats.get(courseId)!, counts);
    }
    return stats;
  }

  private toDto(course: Course, stats: CourseStats): AdminCourseDto {
    return {
      id: course.id,
      name: course.name,
      description: course.description,
      thumbnailUrl: course.thumbnailUrl,
      ...stats,
      createdBy: { id: course.creator!.id, fullName: course.creator!.fullName },
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    };
  }

  private courseNotFound(): AppException {
    return new AppException({
      code: ErrorCode.CourseNotFound,
      messageKey: 'errors.COURSE_NOT_FOUND',
      status: HttpStatus.NOT_FOUND,
    });
  }
}
