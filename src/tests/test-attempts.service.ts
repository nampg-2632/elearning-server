import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/exceptions/error-code.enum';
import { LessonsService } from '../lessons/lessons.service';
import { UserLesson } from '../progress/entities/user-lesson.entity';
import { LessonStatus } from '../progress/enums/lesson-status.enum';
import { lessonAfterAttempt } from '../progress/lesson-after-attempt';
import type { User } from '../users/entities/user.entity';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import {
  AttemptQuestionDto,
  TestAttemptDto,
  TestAttemptResultDto,
} from './dto/test-attempt.dto';
import { AttemptAnswer } from './entities/attempt-answer.entity';
import { LessonTest } from './entities/lesson-test.entity';
import { Question } from './entities/question.entity';
import { TestAttempt } from './entities/test-attempt.entity';
import { AttemptStatus } from './enums/attempt-status.enum';
import { gradeAttempt } from './grade-attempt';

export type StartedAttempt = { attempt: TestAttemptDto; created: boolean };

// Every endpoint requires the lesson to be accessible, like the lesson
// endpoints, so revoked users keep their attempts but cannot reach them.
@Injectable()
export class TestAttemptsService {
  constructor(
    @InjectRepository(TestAttempt)
    private readonly attempts: Repository<TestAttempt>,
    private readonly lessonsService: LessonsService,
  ) {}

  // Returns the attempt in progress if there is one, otherwise starts a new
  // one and marks the lesson `doing` (a passed lesson stays `pass`).
  async start(user: User, lessonId: string): Promise<StartedAttempt> {
    await this.lessonsService.assertExist([lessonId]);
    await this.lessonsService.assertAccessible(user.id, lessonId);
    const test = await this.attempts.manager.findOneBy(LessonTest, {
      lessonId,
    });
    if (!test) {
      throw new AppException({
        code: ErrorCode.TestNotFound,
        messageKey: 'errors.TEST_NOT_FOUND',
        status: HttpStatus.NOT_FOUND,
      });
    }

    const created = await this.attempts.manager.transaction(async (manager) => {
      const totalQuestions = await manager.countBy(Question, {
        testId: test.id,
      });
      // The partial unique index allows one `doing` attempt per user and
      // test, so this is ignored when one exists, even if a concurrent
      // request created it.
      const inserted = await manager
        .createQueryBuilder()
        .insert()
        .into(TestAttempt)
        .values({ userId: user.id, testId: test.id, totalQuestions })
        .orIgnore()
        .execute();
      if ((inserted.raw as unknown[]).length === 0) {
        return false;
      }
      await this.markDoing(manager, user.id, lessonId);
      return true;
    });

    const attempt = await this.attempts.findOneByOrFail({
      userId: user.id,
      testId: test.id,
      status: AttemptStatus.Doing,
    });
    return { attempt: await this.toAttemptDto(attempt, test), created };
  }

  // Grades the attempt and updates the user's lesson in one transaction.
  async submit(
    user: User,
    attemptId: string,
    dto: SubmitAttemptDto,
  ): Promise<TestAttemptResultDto> {
    const { test } = await this.findOwn(user.id, attemptId);

    await this.attempts.manager.transaction(async (manager) => {
      // Row lock so a double submit is applied once; the second request
      // waits and then sees `submitted`.
      const attempt = await manager.findOneOrFail(TestAttempt, {
        where: { id: attemptId },
        lock: { mode: 'pessimistic_write' },
      });
      if (attempt.status !== AttemptStatus.Doing) {
        throw new AppException({
          code: ErrorCode.AttemptAlreadySubmitted,
          messageKey: 'errors.ATTEMPT_ALREADY_SUBMITTED',
          status: HttpStatus.CONFLICT,
        });
      }

      const questions = await this.findQuestions(test.id, manager);
      const grade = gradeAttempt(
        questions.map(({ id, options }) => ({ id, options: options! })),
        dto.answers,
        test.passScore,
      );
      const submittedAt = new Date();
      if (grade.answers.length > 0) {
        await manager.insert(
          AttemptAnswer,
          grade.answers.map((answer) => ({ attemptId, ...answer })),
        );
      }
      await manager.update(
        TestAttempt,
        { id: attemptId },
        {
          status: AttemptStatus.Submitted,
          score: grade.score,
          correctCount: grade.correctCount,
          totalQuestions: grade.totalQuestions,
          passed: grade.passed,
          submittedAt,
        },
      );

      const userLesson = await manager.findOne(UserLesson, {
        where: { userId: user.id, lessonId: test.lessonId },
        lock: { mode: 'pessimistic_write' },
      });
      await manager.upsert(
        UserLesson,
        {
          userId: user.id,
          lessonId: test.lessonId,
          ...lessonAfterAttempt(userLesson, grade, submittedAt),
        },
        ['userId', 'lessonId'],
      );
    });

    const attempt = await this.attempts.findOneByOrFail({ id: attemptId });
    return this.toResultDto(attempt, test);
  }

  // Questions without the answers while `doing`, the result once submitted.
  async findOne(
    user: User,
    attemptId: string,
  ): Promise<TestAttemptDto | TestAttemptResultDto> {
    const { attempt, test } = await this.findOwn(user.id, attemptId);
    return attempt.status === AttemptStatus.Doing
      ? this.toAttemptDto(attempt, test)
      : this.toResultDto(attempt, test);
  }

  // Another user's attempt is reported as not found.
  private async findOwn(
    userId: string,
    attemptId: string,
  ): Promise<{ attempt: TestAttempt; test: LessonTest }> {
    const attempt = await this.attempts.findOne({
      where: { id: attemptId, userId },
      relations: { test: true },
    });
    if (!attempt) {
      throw new AppException({
        code: ErrorCode.AttemptNotFound,
        messageKey: 'errors.ATTEMPT_NOT_FOUND',
        status: HttpStatus.NOT_FOUND,
      });
    }
    const test = attempt.test!;
    await this.lessonsService.assertAccessible(userId, test.lessonId);
    return { attempt, test };
  }

  // Inserts a `doing` row, or moves `todo`/`fail` to `doing`.
  private async markDoing(
    manager: EntityManager,
    userId: string,
    lessonId: string,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .insert()
      .into(UserLesson)
      .values({ userId, lessonId, status: LessonStatus.Doing })
      .orIgnore()
      .execute();
    await manager.update(
      UserLesson,
      {
        userId,
        lessonId,
        status: In([LessonStatus.Todo, LessonStatus.Fail]),
      },
      { status: LessonStatus.Doing },
    );
  }

  // Questions and options ordered by position.
  private findQuestions(
    testId: string,
    manager: EntityManager = this.attempts.manager,
  ): Promise<Question[]> {
    return manager.find(Question, {
      where: { testId },
      relations: { options: true },
      order: { position: 'ASC', options: { position: 'ASC' } },
    });
  }

  private async toAttemptDto(
    attempt: TestAttempt,
    test: LessonTest,
  ): Promise<TestAttemptDto> {
    const questions = await this.findQuestions(test.id);
    return {
      ...this.toAttemptSummary(attempt, test),
      questions: questions.map((question): AttemptQuestionDto => ({
        id: question.id,
        content: question.content,
        options: question.options!.map(({ id, content }) => ({
          id,
          content,
        })),
      })),
    };
  }

  private async toResultDto(
    attempt: TestAttempt,
    test: LessonTest,
  ): Promise<TestAttemptResultDto> {
    const [questions, answers] = await Promise.all([
      this.findQuestions(test.id),
      this.attempts.manager.findBy(AttemptAnswer, { attemptId: attempt.id }),
    ]);
    const answerByQuestion = new Map(
      answers.map((answer) => [answer.questionId, answer]),
    );
    return {
      ...this.toAttemptSummary(attempt, test),
      score: attempt.score!,
      passScore: test.passScore,
      passed: attempt.passed!,
      correctCount: attempt.correctCount!,
      totalQuestions: attempt.totalQuestions,
      submittedAt: attempt.submittedAt!,
      questions: questions.map((question) => {
        const answer = answerByQuestion.get(question.id);
        return {
          id: question.id,
          content: question.content,
          selectedOptionId: answer?.selectedOptionId ?? null,
          correctOptionId:
            question.options!.find(({ isCorrect }) => isCorrect)?.id ?? null,
          isCorrect: answer?.isCorrect ?? false,
          options: question.options!.map(({ id, content }) => ({
            id,
            content,
          })),
        };
      }),
    };
  }

  private toAttemptSummary(
    attempt: TestAttempt,
    test: LessonTest,
  ): Omit<TestAttemptDto, 'questions'> {
    return {
      id: attempt.id,
      testId: test.id,
      lessonId: test.lessonId,
      status: attempt.status,
      startedAt: attempt.startedAt,
    };
  }
}
