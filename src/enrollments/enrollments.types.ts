import type { AdminUserCourseDto } from './dto/admin-user-course.dto';
import type { UserCourse } from './entities/user-course.entity';
import type { EnrollmentStatus } from './enums/enrollment-status.enum';

export type ReviewChanges = Pick<
  UserCourse,
  'status' | 'reviewedBy' | 'reviewedAt' | 'rejectReason'
>;

export interface ReviewResult {
  userCourse: AdminUserCourseDto;
  previousStatus: EnrollmentStatus;
}
