import { HttpStatus } from '@nestjs/common';
import type { EntityManager, Repository } from 'typeorm';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/exceptions/error-code.enum';
import { Course } from '../courses/entities/course.entity';
import { LessonWord } from '../words/entities/lesson-word.entity';
import { AdminLessonsService } from './admin-lessons.service';
import { Lesson } from './entities/lesson.entity';

const expectAppError = async (
  promise: Promise<unknown>,
  code: ErrorCode,
  status: HttpStatus,
) => {
  const error: unknown = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppException);
  expect((error as AppException).code).toBe(code);
  expect((error as AppException).getStatus()).toBe(status);
};

describe('AdminLessonsService', () => {
  let service: AdminLessonsService;
  let manager: {
    findOne: jest.Mock;
    find: jest.Mock;
    delete: jest.Mock;
    insert: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let queryBuilder: Record<string, jest.Mock>;

  beforeEach(() => {
    queryBuilder = {};
    for (const method of ['innerJoin', 'select', 'where']) {
      queryBuilder[method] = jest.fn(() => queryBuilder);
    }
    queryBuilder.getExists = jest.fn();
    manager = {
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
      insert: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn(() => queryBuilder),
    };
    const lessons = {
      manager: {
        transaction: jest.fn((run: (m: EntityManager) => Promise<unknown>) =>
          run(manager as unknown as EntityManager),
        ),
      },
    };
    service = new AdminLessonsService(lessons as unknown as Repository<Lesson>);
  });

  describe('remove', () => {
    it('refuses a lesson that is still in a course', async () => {
      manager.findOne.mockResolvedValue({ id: 'lesson-1' });
      queryBuilder.getExists.mockResolvedValue(true);

      await expectAppError(
        service.remove('lesson-1'),
        ErrorCode.LessonInUse,
        HttpStatus.CONFLICT,
      );
      expect(manager.delete).not.toHaveBeenCalled();
    });

    it('locks the lesson before checking its courses, then deletes it', async () => {
      manager.findOne.mockResolvedValue({ id: 'lesson-1' });
      queryBuilder.getExists.mockResolvedValue(false);

      await service.remove('lesson-1');

      expect(manager.findOne).toHaveBeenCalledWith(
        Lesson,
        expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
      );
      expect(manager.findOne.mock.invocationCallOrder[0]).toBeLessThan(
        queryBuilder.getExists.mock.invocationCallOrder[0],
      );
      expect(manager.delete).toHaveBeenCalledWith(Lesson, { id: 'lesson-1' });
    });

    it('reports a missing lesson as not found', async () => {
      manager.findOne.mockResolvedValue(null);

      await expectAppError(
        service.remove('lesson-1'),
        ErrorCode.LessonNotFound,
        HttpStatus.NOT_FOUND,
      );
      expect(manager.delete).not.toHaveBeenCalled();
    });
  });

  describe('setWords', () => {
    it('keeps the current words when one of the new words is missing', async () => {
      manager.findOne.mockResolvedValue({ id: 'lesson-1' });
      manager.find.mockResolvedValue([{ id: 'word-1' }]);

      await expectAppError(
        service.setWords('lesson-1', ['word-1', 'word-2']),
        ErrorCode.WordNotFound,
        HttpStatus.NOT_FOUND,
      );
      expect(manager.delete).not.toHaveBeenCalled();
      expect(manager.insert).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('reports a missing course before creating anything', async () => {
      manager.findOne.mockResolvedValue(null);

      await expectAppError(
        service.create({ title: 'Lesson', courseId: 'course-1' }),
        ErrorCode.CourseNotFound,
        HttpStatus.NOT_FOUND,
      );
      expect(manager.findOne).toHaveBeenCalledWith(
        Course,
        expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('inserts the words in the given order', async () => {
      manager.find.mockResolvedValue([{ id: 'word-2' }, { id: 'word-1' }]);
      manager.save.mockResolvedValue({ id: 'lesson-1' });
      jest.spyOn(service, 'findOne').mockResolvedValue({} as never);

      await service.create({ title: 'Lesson', wordIds: ['word-2', 'word-1'] });

      expect(manager.insert).toHaveBeenCalledWith(LessonWord, [
        { lessonId: 'lesson-1', wordId: 'word-2', position: 1 },
        { lessonId: 'lesson-1', wordId: 'word-1', position: 2 },
      ]);
    });
  });
});
