import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { paginate, Paginated } from '../common/dto/paginated-response';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/exceptions/error-code.enum';
import { containsPattern } from '../common/utils/sql';
import { CourseLesson } from '../courses/entities/course-lesson.entity';
import { UserCourse } from '../enrollments/entities/user-course.entity';
import { EnrollmentStatus } from '../enrollments/enums/enrollment-status.enum';
import { UserLesson } from '../progress/entities/user-lesson.entity';
import { LessonStatus } from '../progress/enums/lesson-status.enum';
import { LessonTest } from '../tests/entities/lesson-test.entity';
import { Question } from '../tests/entities/question.entity';
import { TestAttempt } from '../tests/entities/test-attempt.entity';
import { AttemptStatus } from '../tests/enums/attempt-status.enum';
import type { User } from '../users/entities/user.entity';
import { LessonWord } from '../words/entities/lesson-word.entity';
import { CourseLessonDto } from './dto/course-lesson.dto';
import { LessonDetailDto, LessonTestSummaryDto } from './dto/lesson-detail.dto';
import { ListLessonsQueryDto } from './dto/list-lessons-query.dto';
import { LessonSummaryDto } from './dto/lesson-summary.dto';
import { Lesson } from './entities/lesson.entity';
import { addLessonSummarySelect } from './lesson-summary.query';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
  ) {}

  async listSummaries(
    query: ListLessonsQueryDto,
  ): Promise<Paginated<LessonSummaryDto>> {
    const qb = this.lessons.createQueryBuilder('lesson');
    if (query.keyword) {
      qb.where('lesson.title ILIKE :keyword', {
        keyword: containsPattern(query.keyword),
      });
    }
    const total = await qb.getCount();

    const items = await addLessonSummarySelect(
      qb.select('lesson.id', 'id').addSelect('lesson.title', 'title'),
      'lesson',
    )
      .orderBy('lesson.title', 'ASC')
      .addOrderBy('lesson.id', 'ASC')
      .offset(query.offset)
      .limit(query.limit)
      .getRawMany<LessonSummaryDto>();

    return paginate(items, total, query);
  }

  // Throws LESSON_NOT_FOUND unless every id exists. Pass the transaction's
  // manager when the check guards a write.
  async assertExist(ids: string[], manager?: EntityManager): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    const repository = manager?.getRepository(Lesson) ?? this.lessons;
    const found = await repository.countBy({ id: In(ids) });
    if (found !== ids.length) {
      throw new AppException({
        code: ErrorCode.LessonNotFound,
        messageKey: 'errors.LESSON_NOT_FOUND',
        status: HttpStatus.NOT_FOUND,
      });
    }
  }

  // Lessons of a course in order, with the user's status (`todo` when there
  // is no user_lessons row). The caller checks course access.
  listForCourse(userId: string, courseId: string): Promise<CourseLessonDto[]> {
    return this.lessons.manager
      .createQueryBuilder(CourseLesson, 'cl')
      .innerJoin('cl.lesson', 'lesson')
      .leftJoin(
        UserLesson,
        'ul',
        'ul.lessonId = cl.lessonId AND ul.userId = :userId',
        { userId },
      )
      .select('lesson.id', 'id')
      .addSelect('lesson.title', 'title')
      .addSelect('cl.position', 'position')
      .addSelect(
        (sub) =>
          sub
            .select('COUNT(*)::int')
            .from(LessonWord, 'lw')
            .where('lw.lessonId = cl.lessonId'),
        'wordCount',
      )
      .addSelect('COALESCE(ul.status, :todo)', 'status')
      .addSelect('ul.bestScore', 'bestScore')
      .setParameter('todo', LessonStatus.Todo)
      .where('cl.courseId = :courseId', { courseId })
      .orderBy('cl.position', 'ASC')
      .getRawMany<CourseLessonDto>();
  }

  async findDetail(user: User, id: string): Promise<LessonDetailDto> {
    const lesson = await this.lessons.findOneBy({ id });
    if (!lesson) {
      throw new AppException({
        code: ErrorCode.LessonNotFound,
        messageKey: 'errors.LESSON_NOT_FOUND',
        status: HttpStatus.NOT_FOUND,
      });
    }
    await this.assertAccessible(user.id, id);

    const manager = this.lessons.manager;
    const [userLesson, lessonWords, test] = await Promise.all([
      manager.findOneBy(UserLesson, { userId: user.id, lessonId: id }),
      manager.find(LessonWord, {
        where: { lessonId: id },
        relations: { word: true },
        order: { position: 'ASC' },
      }),
      manager.findOneBy(LessonTest, { lessonId: id }),
    ]);
    return {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      status: userLesson?.status ?? LessonStatus.Todo,
      bestScore: userLesson?.bestScore ?? null,
      words: lessonWords.map(({ word }) => ({
        id: word!.id,
        content: word!.content,
        meaning: word!.meaning,
      })),
      test: test && (await this.summarizeTest(user.id, test)),
    };
  }

  // A lesson is accessible through any course it belongs to where the
  // user is approved. Soft-deleted courses are excluded on the join.
  private async assertAccessible(
    userId: string,
    lessonId: string,
  ): Promise<void> {
    const accessible = await this.lessons.manager
      .createQueryBuilder(CourseLesson, 'cl')
      .innerJoin('cl.course', 'course')
      .innerJoin(
        UserCourse,
        'uc',
        'uc.courseId = cl.courseId AND uc.userId = :userId AND uc.status = :approved',
        { userId, approved: EnrollmentStatus.Approved },
      )
      .where('cl.lessonId = :lessonId', { lessonId })
      .getExists();
    if (!accessible) {
      throw new AppException({
        code: ErrorCode.LessonNotAccessible,
        messageKey: 'errors.LESSON_NOT_ACCESSIBLE',
        status: HttpStatus.FORBIDDEN,
      });
    }
  }

  private async summarizeTest(
    userId: string,
    test: LessonTest,
  ): Promise<LessonTestSummaryDto> {
    const [questionCount, currentAttempt] = await Promise.all([
      this.lessons.manager.countBy(Question, { testId: test.id }),
      this.lessons.manager.findOne(TestAttempt, {
        select: { id: true },
        where: { userId, testId: test.id, status: AttemptStatus.Doing },
      }),
    ]);
    return {
      id: test.id,
      questionCount,
      passScore: test.passScore,
      currentAttemptId: currentAttempt?.id ?? null,
    };
  }
}
