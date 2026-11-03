import { HttpStatus } from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/exceptions/error-code.enum';

export type GradableQuestion = {
  id: string;
  options: { id: string; isCorrect: boolean }[];
};

export type SubmittedAnswer = { questionId: string; optionId: string };

export type GradedAnswer = {
  questionId: string;
  selectedOptionId: string | null;
  isCorrect: boolean;
};

export type AttemptGrade = {
  answers: GradedAnswer[];
  correctCount: number;
  totalQuestions: number;
  score: number;
  passed: boolean;
};

// One graded answer per question; a question without a submitted answer is
// blank and counts as wrong. Throws INVALID_ANSWER when a question is not in
// the test, is answered twice, or the option is not one of its options.
export function gradeAttempt(
  questions: GradableQuestion[],
  submitted: SubmittedAnswer[],
  passScore: number,
): AttemptGrade {
  const questionIds = new Set(questions.map((question) => question.id));
  const selected = new Map<string, string>();
  for (const { questionId, optionId } of submitted) {
    if (!questionIds.has(questionId) || selected.has(questionId)) {
      throw invalidAnswer();
    }
    selected.set(questionId, optionId);
  }

  const answers = questions.map((question): GradedAnswer => {
    const optionId = selected.get(question.id);
    if (optionId === undefined) {
      return {
        questionId: question.id,
        selectedOptionId: null,
        isCorrect: false,
      };
    }
    const option = question.options.find(({ id }) => id === optionId);
    if (!option) {
      throw invalidAnswer();
    }
    return {
      questionId: question.id,
      selectedOptionId: optionId,
      isCorrect: option.isCorrect,
    };
  });

  const correctCount = answers.filter(({ isCorrect }) => isCorrect).length;
  const totalQuestions = questions.length;
  const score =
    totalQuestions === 0
      ? 0
      : Math.round((correctCount / totalQuestions) * 100);
  return {
    answers,
    correctCount,
    totalQuestions,
    score,
    passed: score >= passScore,
  };
}

function invalidAnswer(): AppException {
  return new AppException({
    code: ErrorCode.InvalidAnswer,
    messageKey: 'errors.INVALID_ANSWER',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
  });
}
