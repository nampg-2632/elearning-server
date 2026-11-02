import { LessonStatus } from './enums/lesson-status.enum';

export type LessonStatusCounts = Record<LessonStatus, number>;

// Lessons per status out of `total`. Lessons without a user_lessons row
// (or with a `todo` row) are not in `counts` and end up as `todo`.
export function lessonStatusCounts(
  total: number,
  counts: Partial<Record<LessonStatus, number>>,
): LessonStatusCounts {
  const doing = counts[LessonStatus.Doing] ?? 0;
  const pass = counts[LessonStatus.Pass] ?? 0;
  const fail = counts[LessonStatus.Fail] ?? 0;
  return {
    [LessonStatus.Todo]: total - doing - pass - fail,
    [LessonStatus.Doing]: doing,
    [LessonStatus.Pass]: pass,
    [LessonStatus.Fail]: fail,
  };
}
