import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { paginate, Paginated } from '../common/dto/paginated-response';
import { containsPattern } from '../common/utils/sql';
import { CourseLesson } from '../courses/entities/course-lesson.entity';
import { UserCourse } from '../enrollments/entities/user-course.entity';
import { EnrollmentStatus } from '../enrollments/enums/enrollment-status.enum';
import { UserLesson } from '../progress/entities/user-lesson.entity';
import { LessonStatus } from '../progress/enums/lesson-status.enum';
import type { User } from '../users/entities/user.entity';
import { ListWordsQueryDto } from './dto/list-words-query.dto';
import { WordDto, WordLessonDto } from './dto/word.dto';
import { LessonWord } from './entities/lesson-word.entity';
import { Word } from './entities/word.entity';
import { WordStatusFilter } from './enums/word-status-filter.enum';
import { WORD_SORT_ORDER } from './words.constants';

type WordRow = Omit<WordDto, 'lessons'>;
type WordLessonRow = WordLessonDto & { wordId: string };

@Injectable()
export class WordsService {
  constructor(
    @InjectRepository(Word) private readonly words: Repository<Word>,
  ) {}

  async list(
    user: User,
    query: ListWordsQueryDto,
  ): Promise<Paginated<WordDto>> {
    // "Learned" follows user_lessons, which is shared across courses: a word
    // is learned once any lesson containing it is passed.
    const learned = `EXISTS (${this.words.manager
      .createQueryBuilder(LessonWord, 'learned_lw')
      .select('1')
      .innerJoin(UserLesson, 'ul', 'ul.lessonId = learned_lw.lessonId')
      .where('learned_lw.wordId = word.id')
      .andWhere('ul.userId = :userId')
      .andWhere(`ul.status = '${LessonStatus.Pass}'`)
      .getQuery()})`;

    const qb = this.words
      .createQueryBuilder('word')
      .whereExists(
        this.scopedLessonWords(user.id, query).andWhere('lw.wordId = word.id'),
      )
      .setParameter('userId', user.id);
    if (query.status === WordStatusFilter.Learned) {
      qb.andWhere(learned);
    } else if (query.status === WordStatusFilter.NotLearned) {
      qb.andWhere(`NOT ${learned}`);
    }
    if (query.keyword) {
      qb.andWhere(
        '(word.content ILIKE :keyword OR word.meaning ILIKE :keyword)',
        { keyword: containsPattern(query.keyword) },
      );
    }
    const total = await qb.getCount();

    const [sortColumn, sortDirection] = WORD_SORT_ORDER[query.sort];
    const words = await qb
      .select('word.id', 'id')
      .addSelect('word.content', 'content')
      .addSelect('word.meaning', 'meaning')
      .addSelect(learned, 'learned')
      .orderBy(sortColumn, sortDirection)
      .addOrderBy('word.id', 'ASC')
      .offset(query.offset)
      .limit(query.limit)
      .getRawMany<WordRow>();

    const lessons = await this.findLessons(
      user.id,
      query,
      words.map((word) => word.id),
    );
    const items = words.map((word) => ({
      ...word,
      lessons: lessons.get(word.id) ?? [],
    }));
    return paginate(items, total, query);
  }

  // Lessons of each word, limited to the same scope as the list.
  private async findLessons(
    userId: string,
    query: ListWordsQueryDto,
    wordIds: string[],
  ): Promise<Map<string, WordLessonDto[]>> {
    const lessons = new Map<string, WordLessonDto[]>();
    if (wordIds.length === 0) {
      return lessons;
    }
    // A lesson can be in several approved courses, hence DISTINCT.
    const rows = await this.scopedLessonWords(userId, query)
      .innerJoin('lw.lesson', 'lesson')
      .select('lw.wordId', 'wordId')
      .addSelect('lesson.id', 'id')
      .addSelect('lesson.title', 'title')
      .distinct(true)
      .andWhere('lw.wordId IN (:...wordIds)', { wordIds })
      .orderBy('lesson.title', 'ASC')
      .addOrderBy('lesson.id', 'ASC')
      .getRawMany<WordLessonRow>();
    for (const { wordId, id, title } of rows) {
      const list = lessons.get(wordId) ?? [];
      list.push({ id, title });
      lessons.set(wordId, list);
    }
    return lessons;
  }

  // lesson_words rows reachable through the user's approved courses and
  // matching the course / lesson filters. Soft-deleted courses are
  // excluded on the join.
  private scopedLessonWords(
    userId: string,
    query: ListWordsQueryDto,
  ): SelectQueryBuilder<LessonWord> {
    const qb = this.words.manager
      .createQueryBuilder(LessonWord, 'lw')
      .innerJoin(CourseLesson, 'cl', 'cl.lessonId = lw.lessonId')
      .innerJoin('cl.course', 'course')
      .innerJoin(
        UserCourse,
        'uc',
        'uc.courseId = cl.courseId AND uc.userId = :userId AND uc.status = :approved',
        { userId, approved: EnrollmentStatus.Approved },
      );
    if (query.courseId) {
      qb.andWhere('cl.courseId = :courseId', { courseId: query.courseId });
    }
    if (query.lessonId) {
      qb.andWhere('lw.lessonId = :lessonId', { lessonId: query.lessonId });
    }
    return qb;
  }
}
