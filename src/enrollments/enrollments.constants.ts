import { EnrollmentStatus } from './enums/enrollment-status.enum';
import { UserCourseSort } from './enums/user-course-sort.enum';

export const REJECT_REASON_MAX_LENGTH = 500;
// Matches users.email, the longer of the two searched columns.
export const STUDENT_KEYWORD_MAX_LENGTH = 320;

// Statuses each admin action may start from.
export const APPROVABLE_STATUSES = [EnrollmentStatus.Pending];
// Rejecting an approved enrollment revokes access to the course.
export const REJECTABLE_STATUSES = [
  EnrollmentStatus.Pending,
  EnrollmentStatus.Approved,
];

// Query builder ORDER BY for each `sort` value of GET /admin/user-courses.
export const USER_COURSE_SORT_ORDER: Record<
  UserCourseSort,
  [column: string, direction: 'ASC' | 'DESC']
> = {
  [UserCourseSort.CreatedAtDesc]: ['uc.createdAt', 'DESC'],
  [UserCourseSort.CreatedAtAsc]: ['uc.createdAt', 'ASC'],
};
