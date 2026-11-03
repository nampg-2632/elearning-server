import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonsModule } from '../lessons/lessons.module';
import { AttemptAnswer } from './entities/attempt-answer.entity';
import { LessonTest } from './entities/lesson-test.entity';
import { QuestionOption } from './entities/question-option.entity';
import { Question } from './entities/question.entity';
import { TestAttempt } from './entities/test-attempt.entity';
import { LessonTestController } from './lesson-test.controller';
import { TestAttemptsController } from './test-attempts.controller';
import { TestAttemptsService } from './test-attempts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LessonTest,
      Question,
      QuestionOption,
      TestAttempt,
      AttemptAnswer,
    ]),
    LessonsModule,
  ],
  controllers: [LessonTestController, TestAttemptsController],
  providers: [TestAttemptsService],
  exports: [TypeOrmModule],
})
export class TestsModule {}
