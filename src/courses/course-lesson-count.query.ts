import type { EntityManager } from 'typeorm';
import { CourseLesson } from './entities/course-lesson.entity';

// Lesson count per course id; courses without lessons get 0.
export async function countCourseLessons(
  manager: EntityManager,
  courseIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>(courseIds.map((id) => [id, 0]));
  if (courseIds.length === 0) {
    return counts;
  }
  const rows = await manager
    .createQueryBuilder(CourseLesson, 'cl')
    .select('cl.courseId', 'courseId')
    .addSelect('COUNT(*)::int', 'lessonCount')
    .where('cl.courseId IN (:...courseIds)', { courseIds })
    .groupBy('cl.courseId')
    .getRawMany<{ courseId: string; lessonCount: number }>();
  for (const { courseId, lessonCount } of rows) {
    counts.set(courseId, lessonCount);
  }
  return counts;
}
