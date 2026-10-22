import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttemptAnswer } from './entities/attempt-answer.entity';
import { LessonTest } from './entities/lesson-test.entity';
import { QuestionOption } from './entities/question-option.entity';
import { Question } from './entities/question.entity';
import { TestAttempt } from './entities/test-attempt.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LessonTest,
      Question,
      QuestionOption,
      TestAttempt,
      AttemptAnswer,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class TestsModule {}
