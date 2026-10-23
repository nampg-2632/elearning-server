import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { LessonWord } from '../words/entities/lesson-word.entity';

// Adds `wordCount` and `hasTest` raw columns for the lesson joined as
// `alias`. Use with getRawMany(). A lesson has at most one test, so the
// join does not multiply rows.
export function addLessonSummarySelect<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
): SelectQueryBuilder<T> {
  return qb
    .leftJoin(`${alias}.test`, 'test')
    .addSelect(
      (sub) =>
        sub
          .select('COUNT(*)::int')
          .from(LessonWord, 'lw')
          .where(`lw.lessonId = ${alias}.id`),
      'wordCount',
    )
    .addSelect('test.id IS NOT NULL', 'hasTest');
}
