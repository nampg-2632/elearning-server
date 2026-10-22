import { Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { hashPassword } from '../../common/utils/password';
import { Course } from '../../courses/entities/course.entity';
import { CourseLesson } from '../../courses/entities/course-lesson.entity';
import { UserCourse } from '../../enrollments/entities/user-course.entity';
import { EnrollmentStatus } from '../../enrollments/enums/enrollment-status.enum';
import { Lesson } from '../../lessons/entities/lesson.entity';
import { LessonTest } from '../../tests/entities/lesson-test.entity';
import { QuestionOption } from '../../tests/entities/question-option.entity';
import { Question } from '../../tests/entities/question.entity';
import { User } from '../../users/entities/user.entity';
import { LessonWord } from '../../words/entities/lesson-word.entity';
import { Word } from '../../words/entities/word.entity';
import dataSource from '../typeorm.datasource';
import {
  SeedLesson,
  seedCourses,
  seedEnrollments,
  seedLessons,
  seedUsers,
} from './seed-data';
import { seedId } from './seed-id';

const OPTIONS_PER_QUESTION = 4;
const logger = new Logger('Seed');

async function seedUsersTable(manager: EntityManager): Promise<void> {
  const rows = await Promise.all(
    seedUsers.map(async (user) => ({
      id: seedId(`user:${user.key}`),
      email: user.email,
      passwordHash: await hashPassword(user.password),
      fullName: user.fullName,
      role: user.role,
    })),
  );
  await manager.upsert(User, rows, ['id']);
}

async function seedLessonsTable(manager: EntityManager): Promise<void> {
  await manager.upsert(
    Lesson,
    seedLessons.map((lesson) => ({
      id: seedId(`lesson:${lesson.key}`),
      title: lesson.title,
      description: lesson.description,
    })),
    ['id'],
  );

  for (const lesson of seedLessons) {
    await seedLessonWords(manager, lesson);
    await seedLessonTest(manager, lesson);
  }
}

async function seedLessonWords(
  manager: EntityManager,
  lesson: SeedLesson,
): Promise<void> {
  const lessonId = seedId(`lesson:${lesson.key}`);
  const words = lesson.words.map((word) => ({
    id: seedId(`word:${lesson.key}:${word.content}`),
    content: word.content,
    meaning: word.meaning,
  }));
  await manager.upsert(Word, words, ['id']);

  // Re-create the links so positions always match the seed file.
  await manager.delete(LessonWord, { lessonId });
  await manager.insert(
    LessonWord,
    words.map((word, index) => ({
      lessonId,
      wordId: word.id,
      position: index + 1,
    })),
  );
}

// One question per word: pick the meaning among the meanings of the next
// words in the lesson. The correct option's position rotates per question.
async function seedLessonTest(
  manager: EntityManager,
  lesson: SeedLesson,
): Promise<void> {
  const testId = seedId(`test:${lesson.key}`);
  await manager.upsert(
    LessonTest,
    [
      {
        id: testId,
        lessonId: seedId(`lesson:${lesson.key}`),
        passScore: lesson.passScore,
      },
    ],
    ['id'],
  );

  const questions: Partial<Question>[] = [];
  const options: Partial<QuestionOption>[] = [];

  lesson.words.forEach((word, index) => {
    const questionKey = `question:${lesson.key}:${index + 1}`;
    const questionId = seedId(questionKey);
    questions.push({
      id: questionId,
      testId,
      content: `"${word.content}" nghĩa là gì?`,
      position: index + 1,
    });

    const distractors = Array.from(
      { length: OPTIONS_PER_QUESTION - 1 },
      (_, offset) =>
        lesson.words[(index + offset + 1) % lesson.words.length].meaning,
    );
    const correctIndex = index % OPTIONS_PER_QUESTION;
    const contents = [...distractors];
    contents.splice(correctIndex, 0, word.meaning);

    contents.forEach((content, optionIndex) => {
      options.push({
        id: seedId(`${questionKey}:option:${optionIndex + 1}`),
        questionId,
        content,
        isCorrect: optionIndex === correctIndex,
        position: optionIndex + 1,
      });
    });
  });

  await manager.upsert(Question, questions, ['id']);
  // Clear the old correct flags first so the "one correct option" index
  // never sees two correct options while rows are updated.
  await manager.update(
    QuestionOption,
    options.map((option) => option.id),
    { isCorrect: false },
  );
  await manager.upsert(QuestionOption, options, ['id']);
}

async function seedCoursesTable(manager: EntityManager): Promise<void> {
  const adminId = seedId('user:admin');
  await manager.upsert(
    Course,
    seedCourses.map((course) => ({
      id: seedId(`course:${course.key}`),
      name: course.name,
      description: course.description,
      createdBy: adminId,
    })),
    ['id'],
  );

  for (const course of seedCourses) {
    const courseId = seedId(`course:${course.key}`);
    await manager.delete(CourseLesson, { courseId });
    await manager.insert(
      CourseLesson,
      course.lessonKeys.map((lessonKey, index) => ({
        courseId,
        lessonId: seedId(`lesson:${lessonKey}`),
        position: index + 1,
      })),
    );
  }
}

// Enrollments are only created, never overwritten, so state changed
// through the API (approve/reject) survives a re-run.
async function seedEnrollmentsTable(manager: EntityManager): Promise<void> {
  const adminId = seedId('user:admin');
  const now = new Date();
  await manager
    .createQueryBuilder()
    .insert()
    .into(UserCourse)
    .values(
      seedEnrollments.map((enrollment) => {
        const reviewed = enrollment.status !== EnrollmentStatus.Pending;
        return {
          id: seedId(
            `enrollment:${enrollment.userKey}:${enrollment.courseKey}`,
          ),
          userId: seedId(`user:${enrollment.userKey}`),
          courseId: seedId(`course:${enrollment.courseKey}`),
          status: enrollment.status,
          reviewedBy: reviewed ? adminId : null,
          reviewedAt: reviewed ? now : null,
        };
      }),
    )
    .orIgnore()
    .execute();
}

async function run(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed demo data when NODE_ENV=production');
  }

  await dataSource.initialize();
  try {
    await dataSource.transaction(async (manager) => {
      await seedUsersTable(manager);
      await seedLessonsTable(manager);
      await seedCoursesTable(manager);
      await seedEnrollmentsTable(manager);
    });
    logger.log(
      `Seeded ${seedUsers.length} users, ${seedCourses.length} courses, ${seedLessons.length} lessons`,
    );
  } finally {
    await dataSource.destroy();
  }
}

run().catch((error: unknown) => {
  logger.error(error instanceof Error ? (error.stack ?? error.message) : error);
  process.exit(1);
});
