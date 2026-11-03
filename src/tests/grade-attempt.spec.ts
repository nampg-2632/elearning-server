import { HttpStatus } from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/exceptions/error-code.enum';
import { GradableQuestion, gradeAttempt } from './grade-attempt';

// Five questions; option `<q>-a` is correct.
const questions: GradableQuestion[] = ['q1', 'q2', 'q3', 'q4', 'q5'].map(
  (id) => ({
    id,
    options: [
      { id: `${id}-a`, isCorrect: true },
      { id: `${id}-b`, isCorrect: false },
    ],
  }),
);

const expectInvalidAnswer = (grade: () => unknown) => {
  let error: unknown;
  try {
    grade();
  } catch (e) {
    error = e;
  }
  expect(error).toBeInstanceOf(AppException);
  expect((error as AppException).code).toBe(ErrorCode.InvalidAnswer);
  expect((error as AppException).getStatus()).toBe(
    HttpStatus.UNPROCESSABLE_ENTITY,
  );
};

describe('gradeAttempt', () => {
  it('passes when the score reaches the pass score', () => {
    const grade = gradeAttempt(
      questions,
      [
        { questionId: 'q1', optionId: 'q1-a' },
        { questionId: 'q2', optionId: 'q2-a' },
        { questionId: 'q3', optionId: 'q3-a' },
        { questionId: 'q4', optionId: 'q4-a' },
        { questionId: 'q5', optionId: 'q5-b' },
      ],
      80,
    );
    expect(grade).toMatchObject({
      correctCount: 4,
      totalQuestions: 5,
      score: 80,
      passed: true,
    });
  });

  it('fails below the pass score and rounds the score', () => {
    const grade = gradeAttempt(
      questions.slice(0, 3),
      [
        { questionId: 'q1', optionId: 'q1-a' },
        { questionId: 'q2', optionId: 'q2-a' },
        { questionId: 'q3', optionId: 'q3-b' },
      ],
      70,
    );
    expect(grade).toMatchObject({ correctCount: 2, score: 67, passed: false });
  });

  it('counts questions left out as blank and wrong, in question order', () => {
    const grade = gradeAttempt(
      questions,
      [
        { questionId: 'q3', optionId: 'q3-a' },
        { questionId: 'q1', optionId: 'q1-b' },
      ],
      80,
    );
    expect(grade.answers).toEqual([
      { questionId: 'q1', selectedOptionId: 'q1-b', isCorrect: false },
      { questionId: 'q2', selectedOptionId: null, isCorrect: false },
      { questionId: 'q3', selectedOptionId: 'q3-a', isCorrect: true },
      { questionId: 'q4', selectedOptionId: null, isCorrect: false },
      { questionId: 'q5', selectedOptionId: null, isCorrect: false },
    ]);
    expect(grade).toMatchObject({ correctCount: 1, score: 20, passed: false });
  });

  it('scores 0 when every question is blank', () => {
    expect(gradeAttempt(questions, [], 80)).toMatchObject({
      correctCount: 0,
      totalQuestions: 5,
      score: 0,
      passed: false,
    });
  });

  it('scores 0 for a test without questions', () => {
    expect(gradeAttempt([], [], 80)).toEqual({
      answers: [],
      correctCount: 0,
      totalQuestions: 0,
      score: 0,
      passed: false,
    });
  });

  it('rejects a question that is not in the test', () => {
    expectInvalidAnswer(() =>
      gradeAttempt(questions, [{ questionId: 'q9', optionId: 'q1-a' }], 80),
    );
  });

  it('rejects an option of another question', () => {
    expectInvalidAnswer(() =>
      gradeAttempt(questions, [{ questionId: 'q1', optionId: 'q2-a' }], 80),
    );
  });

  it('rejects a question answered twice', () => {
    expectInvalidAnswer(() =>
      gradeAttempt(
        questions,
        [
          { questionId: 'q1', optionId: 'q1-b' },
          { questionId: 'q1', optionId: 'q1-a' },
        ],
        80,
      ),
    );
  });
});
