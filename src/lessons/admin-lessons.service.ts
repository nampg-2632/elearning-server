import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { paginate, Paginated } from '../common/dto/paginated-response';
import { containsPattern } from '../common/utils/sql';
import { CourseLesson } from '../courses/entities/course-lesson.entity';
import { Course } from '../courses/entities/course.entity';
import { LessonTest } from '../tests/entities/lesson-test.entity';
import { Question } from '../tests/entities/question.entity';
import { TestAttempt } from '../tests/entities/test-attempt.entity';
import { LessonWord } from '../words/entities/lesson-word.entity';
import { Word } from '../words/entities/word.entity';
import {
  AdminLessonCourseDto,
  AdminLessonDetailDto,
  AdminLessonDto,
  AdminLessonTestDto,
  AdminLessonWordDto,
} from './dto/admin-lesson.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { ListLessonsQueryDto } from './dto/list-lessons-query.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { Lesson } from './entities/lesson.entity';
import { addLessonSummarySelect } from './lesson-summary.query';
import { ADMIN_LESSON_SORT_ORDER } from './lessons.constants';
import { courseNotFound } from '../courses/course.errors';
import { wordNotFound } from '../words/word.errors';
import { lessonInUse, lessonNotFound } from './lesson.errors';

// Lessons are shared between courses, so any admin can manage any lesson.
@Injectable()
export class AdminLessonsService {
  constructor(
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
  ) {}

  async list(query: ListLessonsQueryDto): Promise<Paginated<AdminLessonDto>> {
    const qb = this.lessons.createQueryBuilder('lesson');
    if (query.keyword) {
      qb.where('lesson.title ILIKE :keyword', {
        keyword: containsPattern(query.keyword),
      });
    }
    const total = await qb.getCount();

    const [sortColumn, sortDirection] = ADMIN_LESSON_SORT_ORDER[query.sort];
    const items = await addLessonSummarySelect(
      qb.select('lesson.id', 'id').addSelect('lesson.title', 'title'),
      'lesson',
    )
      .addSelect(
        (sub) =>
          sub
            .select('COUNT(*)::int')
            .from(CourseLesson, 'cl')
            .innerJoin('cl.course', 'course')
            .where('cl.lessonId = lesson.id'),
        'courseCount',
      )
      .addSelect('lesson.createdAt', 'createdAt')
      .orderBy(sortColumn, sortDirection)
      .addOrderBy('lesson.id', 'ASC')
      .offset(query.offset)
      .limit(query.limit)
      .getRawMany<AdminLessonDto>();

    return paginate(items, total, query);
  }

  async findOne(id: string): Promise<AdminLessonDetailDto> {
    const lesson = await this.lessons.findOneBy({ id });
    if (!lesson) {
      throw lessonNotFound();
    }

    const manager = this.lessons.manager;
    const [words, test, courses] = await Promise.all([
      this.findWords(id),
      manager.findOneBy(LessonTest, { lessonId: id }),
      manager
        .createQueryBuilder(CourseLesson, 'cl')
        .innerJoin('cl.course', 'course')
        .select('course.id', 'id')
        .addSelect('course.name', 'name')
        .where('cl.lessonId = :id', { id })
        .orderBy('course.name', 'ASC')
        .addOrderBy('course.id', 'ASC')
        .getRawMany<AdminLessonCourseDto>(),
    ]);
    return {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      words,
      test: test && (await this.summarizeTest(test)),
      courses,
      createdAt: lesson.createdAt,
      updatedAt: lesson.updatedAt,
    };
  }

  async create(dto: CreateLessonDto): Promise<AdminLessonDetailDto> {
    const wordIds = dto.wordIds ?? [];
    const lessonId = await this.lessons.manager.transaction(async (manager) => {
      // Same lock as PUT /admin/courses/:id/lessons, so appending does not
      // race with a replacement on the (course_id, position) key.
      if (dto.courseId) {
        const course = await manager.findOne(Course, {
          where: { id: dto.courseId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!course) {
          throw courseNotFound();
        }
      }
      await this.assertWordsExist(manager, wordIds);

      const lesson = await manager.save(
        manager.create(Lesson, {
          title: dto.title,
          description: dto.description ?? null,
        }),
      );
      await this.insertWords(manager, lesson.id, wordIds);
      if (dto.courseId) {
        await this.appendToCourse(manager, dto.courseId, lesson.id);
      }
      return lesson.id;
    });
    return this.findOne(lessonId);
  }

  async update(
    id: string,
    dto: UpdateLessonDto,
  ): Promise<AdminLessonDetailDto> {
    const lesson = await this.lessons.findOneBy({ id });
    if (!lesson) {
      throw lessonNotFound();
    }
    // undefined = not sent (keep), null = clear.
    if (dto.title !== undefined) lesson.title = dto.title;
    if (dto.description !== undefined) lesson.description = dto.description;
    await this.lessons.save(lesson);
    return this.findOne(id);
  }

  // Replaces the word list. "Learned" comes from user_lessons, so no
  // progress is lost.
  async setWords(id: string, wordIds: string[]): Promise<AdminLessonWordDto[]> {
    await this.lessons.manager.transaction(async (manager) => {
      // Row lock serialises concurrent replacements of the same lesson,
      // which would otherwise collide on the (lesson_id, position) key.
      await this.lockLesson(manager, id);
      await this.assertWordsExist(manager, wordIds);
      await manager.delete(LessonWord, { lessonId: id });
      await this.insertWords(manager, id, wordIds);
    });
    return this.findWords(id);
  }

  // Hard delete, refused while the lesson is in a course that is not
  // deleted. Its test, attempts and user_lessons are removed by cascade.
  async remove(id: string): Promise<void> {
    await this.lessons.manager.transaction(async (manager) => {
      // Adding the lesson to a course takes a key-share lock on its row
      // through the foreign key, so this lock waits for that to commit and
      // the check below then sees the new course_lessons row.
      await this.lockLesson(manager, id);
      const inUse = await manager
        .createQueryBuilder(CourseLesson, 'cl')
        .innerJoin('cl.course', 'course')
        .where('cl.lessonId = :id', { id })
        .getExists();
      if (inUse) {
        throw lessonInUse();
      }
      await manager.delete(Lesson, { id });
    });
  }

  private async lockLesson(manager: EntityManager, id: string): Promise<void> {
    const lesson = await manager.findOne(Lesson, {
      select: { id: true },
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!lesson) {
      throw lessonNotFound();
    }
  }

  // Key-share lock so a word cannot be deleted before the insert commits.
  private async assertWordsExist(
    manager: EntityManager,
    ids: string[],
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    const found = await manager.find(Word, {
      select: { id: true },
      where: { id: In(ids) },
      lock: { mode: 'for_key_share' },
    });
    if (found.length !== ids.length) {
      throw wordNotFound();
    }
  }

  private async insertWords(
    manager: EntityManager,
    lessonId: string,
    wordIds: string[],
  ): Promise<void> {
    if (wordIds.length === 0) {
      return;
    }
    await manager.insert(
      LessonWord,
      wordIds.map((wordId, index) => ({
        lessonId,
        wordId,
        position: index + 1,
      })),
    );
  }

  // The caller holds the course row lock.
  private async appendToCourse(
    manager: EntityManager,
    courseId: string,
    lessonId: string,
  ): Promise<void> {
    const { last } = (await manager
      .createQueryBuilder(CourseLesson, 'cl')
      .select('COALESCE(MAX(cl.position), 0)::int', 'last')
      .where('cl.courseId = :courseId', { courseId })
      .getRawOne<{ last: number }>())!;
    await manager.insert(CourseLesson, {
      courseId,
      lessonId,
      position: last + 1,
    });
  }

  private findWords(lessonId: string): Promise<AdminLessonWordDto[]> {
    return this.lessons.manager
      .createQueryBuilder(LessonWord, 'lw')
      .innerJoin('lw.word', 'word')
      .select('word.id', 'id')
      .addSelect('word.content', 'content')
      .addSelect('word.meaning', 'meaning')
      .addSelect('lw.position', 'position')
      .where('lw.lessonId = :lessonId', { lessonId })
      .orderBy('lw.position', 'ASC')
      .getRawMany<AdminLessonWordDto>();
  }

  private async summarizeTest(test: LessonTest): Promise<AdminLessonTestDto> {
    const manager = this.lessons.manager;
    const [questionCount, hasAttempts] = await Promise.all([
      manager.countBy(Question, { testId: test.id }),
      manager.existsBy(TestAttempt, { testId: test.id }),
    ]);
    return {
      id: test.id,
      questionCount,
      passScore: test.passScore,
      hasAttempts,
    };
  }
}
