import { HttpStatus } from '@nestjs/common';
import type { EntityManager, Repository } from 'typeorm';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/exceptions/error-code.enum';
import { Lesson } from '../lessons/entities/lesson.entity';
import { AdminWordsService } from './admin-words.service';
import { LessonWord } from './entities/lesson-word.entity';
import { Word } from './entities/word.entity';

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

describe('AdminWordsService', () => {
  let service: AdminWordsService;
  let words: { delete: jest.Mock; manager: { transaction: jest.Mock } };
  let manager: {
    find: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    insert: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let queryBuilder: Record<string, jest.Mock>;

  beforeEach(() => {
    queryBuilder = {};
    for (const method of ['select', 'where']) {
      queryBuilder[method] = jest.fn(() => queryBuilder);
    }
    queryBuilder.getRawOne = jest.fn();
    manager = {
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn((_entity: unknown, data: unknown) => data),
      insert: jest.fn(),
      createQueryBuilder: jest.fn(() => queryBuilder),
    };
    words = {
      delete: jest.fn(),
      manager: {
        transaction: jest.fn((run: (m: EntityManager) => Promise<unknown>) =>
          run(manager as unknown as EntityManager),
        ),
      },
    };
    service = new AdminWordsService(words as unknown as Repository<Word>);
  });

  describe('create', () => {
    it('locks the lessons in id order and appends the word to each', async () => {
      manager.find.mockResolvedValue([{ id: 'lesson-1' }, { id: 'lesson-2' }]);
      manager.save.mockResolvedValue({ id: 'word-1' });
      queryBuilder.getRawOne
        .mockResolvedValueOnce({ last: 4 })
        .mockResolvedValueOnce({ last: 0 });
      jest.spyOn(service, 'findOne').mockResolvedValue({} as never);

      await service.create({
        content: 'deadline',
        meaning: 'hạn chót',
        lessonIds: ['lesson-2', 'lesson-1'],
      });

      expect(manager.find).toHaveBeenCalledWith(
        Lesson,
        expect.objectContaining({
          order: { id: 'ASC' },
          lock: { mode: 'pessimistic_write' },
        }),
      );
      expect(manager.find.mock.invocationCallOrder[0]).toBeLessThan(
        manager.save.mock.invocationCallOrder[0],
      );
      expect(manager.insert).toHaveBeenNthCalledWith(1, LessonWord, {
        lessonId: 'lesson-2',
        wordId: 'word-1',
        position: 5,
      });
      expect(manager.insert).toHaveBeenNthCalledWith(2, LessonWord, {
        lessonId: 'lesson-1',
        wordId: 'word-1',
        position: 1,
      });
    });

    it('reports a missing lesson before creating the word', async () => {
      manager.find.mockResolvedValue([{ id: 'lesson-1' }]);

      await expectAppError(
        service.create({
          content: 'deadline',
          meaning: 'hạn chót',
          lessonIds: ['lesson-1', 'lesson-2'],
        }),
        ErrorCode.LessonNotFound,
        HttpStatus.NOT_FOUND,
      );
      expect(manager.save).not.toHaveBeenCalled();
      expect(manager.insert).not.toHaveBeenCalled();
    });

    it('creates a word without lessons without locking anything', async () => {
      manager.save.mockResolvedValue({ id: 'word-1' });
      jest.spyOn(service, 'findOne').mockResolvedValue({} as never);

      await service.create({ content: 'deadline', meaning: 'hạn chót' });

      expect(manager.find).not.toHaveBeenCalled();
      expect(manager.insert).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('reports a missing word as not found', async () => {
      words.delete.mockResolvedValue({ affected: 0 });

      await expectAppError(
        service.remove('word-1'),
        ErrorCode.WordNotFound,
        HttpStatus.NOT_FOUND,
      );
    });
  });
});
