import { AdminLessonSort } from './enums/admin-lesson-sort.enum';

// Matches lessons.title.
export const LESSON_TITLE_MAX_LENGTH = 255;

// Query builder ORDER BY for each `sort` value of GET /admin/lessons.
export const ADMIN_LESSON_SORT_ORDER: Record<
  AdminLessonSort,
  [column: string, direction: 'ASC' | 'DESC']
> = {
  [AdminLessonSort.TitleAsc]: ['lesson.title', 'ASC'],
  [AdminLessonSort.TitleDesc]: ['lesson.title', 'DESC'],
  [AdminLessonSort.CreatedAtDesc]: ['lesson.createdAt', 'DESC'],
  [AdminLessonSort.CreatedAtAsc]: ['lesson.createdAt', 'ASC'],
};
