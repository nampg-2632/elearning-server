import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { paginate, Paginated } from '../common/dto/paginated-response';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/exceptions/error-code.enum';
import { containsPattern } from '../common/utils/sql';
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
}
