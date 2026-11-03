import type { UserLesson } from './entities/user-lesson.entity';
import { LessonStatus } from './enums/lesson-status.enum';

export type LessonResult = Pick<
  UserLesson,
  'status' | 'bestScore' | 'passedAt'
>;

// The user's lesson row after a submitted attempt: a passed lesson stays
// passed, bestScore keeps the highest score and passedAt the first pass.
export function lessonAfterAttempt(
  current: LessonResult | null,
  attempt: { score: number; passed: boolean },
  submittedAt: Date,
): LessonResult {
  const passed = attempt.passed || current?.status === LessonStatus.Pass;
  return {
    status: passed ? LessonStatus.Pass : LessonStatus.Fail,
    bestScore: Math.max(current?.bestScore ?? 0, attempt.score),
    passedAt: current?.passedAt ?? (attempt.passed ? submittedAt : null),
  };
}
