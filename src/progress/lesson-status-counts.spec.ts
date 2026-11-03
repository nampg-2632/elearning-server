import { LessonStatus } from './enums/lesson-status.enum';
import { lessonStatusCounts } from './lesson-status-counts';

describe('lessonStatusCounts', () => {
  it('counts lessons without a status as todo', () => {
    expect(
      lessonStatusCounts(12, {
        [LessonStatus.Doing]: 1,
        [LessonStatus.Pass]: 5,
        [LessonStatus.Fail]: 1,
      }),
    ).toEqual({ todo: 5, doing: 1, pass: 5, fail: 1 });
  });

  it('returns all todo when the user has not started', () => {
    expect(lessonStatusCounts(3, {})).toEqual({
      todo: 3,
      doing: 0,
      pass: 0,
      fail: 0,
    });
  });

  it('returns zeros for a course without lessons', () => {
    expect(lessonStatusCounts(0, {})).toEqual({
      todo: 0,
      doing: 0,
      pass: 0,
      fail: 0,
    });
  });
});
