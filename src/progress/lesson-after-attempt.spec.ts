import { LessonStatus } from './enums/lesson-status.enum';
import { lessonAfterAttempt } from './lesson-after-attempt';

const submittedAt = new Date('2026-11-03T03:00:00.000Z');
const passedAt = new Date('2026-11-01T03:00:00.000Z');

describe('lessonAfterAttempt', () => {
  it('passes a lesson on its first passed attempt', () => {
    expect(
      lessonAfterAttempt(
        { status: LessonStatus.Doing, bestScore: null, passedAt: null },
        { score: 83, passed: true },
        submittedAt,
      ),
    ).toEqual({
      status: LessonStatus.Pass,
      bestScore: 83,
      passedAt: submittedAt,
    });
  });

  it('fails a lesson that was not passed before', () => {
    expect(
      lessonAfterAttempt(
        { status: LessonStatus.Doing, bestScore: 50, passedAt: null },
        { score: 33, passed: false },
        submittedAt,
      ),
    ).toEqual({ status: LessonStatus.Fail, bestScore: 50, passedAt: null });
  });

  it('keeps a passed lesson passed after a failed attempt', () => {
    expect(
      lessonAfterAttempt(
        { status: LessonStatus.Pass, bestScore: 100, passedAt },
        { score: 17, passed: false },
        submittedAt,
      ),
    ).toEqual({ status: LessonStatus.Pass, bestScore: 100, passedAt });
  });

  it('keeps the first pass time and raises the best score', () => {
    expect(
      lessonAfterAttempt(
        { status: LessonStatus.Pass, bestScore: 83, passedAt },
        { score: 100, passed: true },
        submittedAt,
      ),
    ).toEqual({ status: LessonStatus.Pass, bestScore: 100, passedAt });
  });

  it('handles a lesson without a row', () => {
    expect(
      lessonAfterAttempt(null, { score: 0, passed: false }, submittedAt),
    ).toEqual({ status: LessonStatus.Fail, bestScore: 0, passedAt: null });
  });
});
