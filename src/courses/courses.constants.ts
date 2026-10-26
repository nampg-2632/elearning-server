import { AdminCourseSort } from './enums/admin-course-sort.enum';

// Match the column lengths in the courses / users tables.
export const COURSE_NAME_MAX_LENGTH = 255;
export const COURSE_THUMBNAIL_URL_MAX_LENGTH = 2048;
export const STUDENT_NAME_MAX_LENGTH = 100;

// Query builder ORDER BY for each `sort` value of GET /admin/courses.
export const ADMIN_COURSE_SORT_ORDER: Record<
  AdminCourseSort,
  [column: string, direction: 'ASC' | 'DESC']
> = {
  [AdminCourseSort.CreatedAtDesc]: ['course.createdAt', 'DESC'],
  [AdminCourseSort.CreatedAtAsc]: ['course.createdAt', 'ASC'],
  [AdminCourseSort.NameAsc]: ['course.name', 'ASC'],
  [AdminCourseSort.NameDesc]: ['course.name', 'DESC'],
};
