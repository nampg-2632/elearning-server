import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { paginate, Paginated } from '../common/dto/paginated-response';
import { containsPattern } from '../common/utils/sql';
import { Lesson } from '../lessons/entities/lesson.entity';
import { lessonNotFound } from '../lessons/lesson.errors';
import { AdminWordDetailDto, AdminWordDto } from './dto/admin-word.dto';
import { CreateWordDto } from './dto/create-word.dto';
import { ListAdminWordsQueryDto } from './dto/list-admin-words-query.dto';
import { UpdateWordDto } from './dto/update-word.dto';
import { WordLessonDto } from './dto/word.dto';
import { LessonWord } from './entities/lesson-word.entity';
import { Word } from './entities/word.entity';
import { wordNotFound } from './word.errors';
import { WORD_SORT_ORDER } from './words.constants';

// Words are shared between lessons, so any admin can manage any word.
@Injectable()
export class AdminWordsService {
  constructor(
    @InjectRepository(Word) private readonly words: Repository<Word>,
  ) {}

  async list(query: ListAdminWordsQueryDto): Promise<Paginated<AdminWordDto>> {
    const qb = this.words.createQueryBuilder('word');
    if (query.keyword) {
      qb.andWhere(
        '(word.content ILIKE :keyword OR word.meaning ILIKE :keyword)',
        { keyword: containsPattern(query.keyword) },
      );
    }
    if (query.lessonId) {
      qb.andWhereExists(
        this.words.manager
          .createQueryBuilder(LessonWord, 'lw')
          .where('lw.wordId = word.id')
          .andWhere('lw.lessonId = :lessonId', { lessonId: query.lessonId }),
      );
    }
    const total = await qb.getCount();

    const [sortColumn, sortDirection] = WORD_SORT_ORDER[query.sort];
    const items = await qb
      .select('word.id', 'id')
      .addSelect('word.content', 'content')
      .addSelect('word.meaning', 'meaning')
      .addSelect(
        (sub) =>
          sub
            .select('COUNT(*)::int')
            .from(LessonWord, 'lw_count')
            .where('lw_count.wordId = word.id'),
        'lessonCount',
      )
      .addSelect('word.createdAt', 'createdAt')
      .orderBy(sortColumn, sortDirection)
      .addOrderBy('word.id', 'ASC')
      .offset(query.offset)
      .limit(query.limit)
      .getRawMany<AdminWordDto>();

    return paginate(items, total, query);
  }

  async findOne(id: string): Promise<AdminWordDetailDto> {
    const word = await this.words.findOneBy({ id });
    if (!word) {
      throw wordNotFound();
    }
    const lessons = await this.words.manager
      .createQueryBuilder(LessonWord, 'lw')
      .innerJoin('lw.lesson', 'lesson')
      .select('lesson.id', 'id')
      .addSelect('lesson.title', 'title')
      .where('lw.wordId = :id', { id })
      .orderBy('lesson.title', 'ASC')
      .addOrderBy('lesson.id', 'ASC')
      .getRawMany<WordLessonDto>();
    return {
      id: word.id,
      content: word.content,
      meaning: word.meaning,
      lessons,
      createdAt: word.createdAt,
      updatedAt: word.updatedAt,
    };
  }

  async create(dto: CreateWordDto): Promise<AdminWordDetailDto> {
    const lessonIds = dto.lessonIds ?? [];
    const wordId = await this.words.manager.transaction(async (manager) => {
      // Same row lock as PUT /admin/lessons/:id/words, so appending does
      // not race with a replacement on the (lesson_id, position) key.
      await this.lockLessons(manager, lessonIds);
      const word = await manager.save(
        manager.create(Word, { content: dto.content, meaning: dto.meaning }),
      );
      for (const lessonId of lessonIds) {
        await this.appendToLesson(manager, lessonId, word.id);
      }
      return word.id;
    });
    return this.findOne(wordId);
  }

  async update(id: string, dto: UpdateWordDto): Promise<AdminWordDetailDto> {
    const word = await this.words.findOneBy({ id });
    if (!word) {
      throw wordNotFound();
    }
    if (dto.content !== undefined) word.content = dto.content;
    if (dto.meaning !== undefined) word.meaning = dto.meaning;
    await this.words.save(word);
    return this.findOne(id);
  }

  // Hard delete; lesson_words rows go by cascade. "Learned" follows
  // user_lessons, so no progress is lost. Positions in the lessons keep a
  // gap, which the admin lesson detail renumbers on read.
  async remove(id: string): Promise<void> {
    const { affected } = await this.words.delete({ id });
    if (!affected) {
      throw wordNotFound();
    }
  }

  // Locks in id order so two requests sharing lessons cannot deadlock.
  private async lockLessons(
    manager: EntityManager,
    ids: string[],
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    const found = await manager.find(Lesson, {
      select: { id: true },
      where: { id: In(ids) },
      order: { id: 'ASC' },
      lock: { mode: 'pessimistic_write' },
    });
    if (found.length !== ids.length) {
      throw lessonNotFound();
    }
  }

  // The caller holds the lesson row lock.
  private async appendToLesson(
    manager: EntityManager,
    lessonId: string,
    wordId: string,
  ): Promise<void> {
    const { last } = (await manager
      .createQueryBuilder(LessonWord, 'lw')
      .select('COALESCE(MAX(lw.position), 0)::int', 'last')
      .where('lw.lessonId = :lessonId', { lessonId })
      .getRawOne<{ last: number }>())!;
    await manager.insert(LessonWord, { lessonId, wordId, position: last + 1 });
  }
}
