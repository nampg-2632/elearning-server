import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseLesson } from '../courses/entities/course-lesson.entity';
import { CourseProgressSummaryDto } from './dto/course-progress-summary.dto';
import { UserLesson } from './entities/user-lesson.entity';
import { LessonStatus } from './enums/lesson-status.enum';
import { progressPercent } from './progress-percent';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(UserLesson)
    private readonly userLessons: Repository<UserLesson>,
  ) {}

  // Passed lessons over the course's current lesson list, for each course
  // id. A lesson passed in another course counts here too.
  async summarize(
    userId: string,
    courseIds: string[],
  ): Promise<Map<string, CourseProgressSummaryDto>> {
    const summaries = new Map<string, CourseProgressSummaryDto>(
      courseIds.map((id) => [
        id,
        { totalLessons: 0, passedLessons: 0, percent: 0 },
      ]),
    );
    if (courseIds.length === 0) {
      return summaries;
    }

    const rows = await this.userLessons.manager
      .createQueryBuilder(CourseLesson, 'cl')
      .leftJoin(
        UserLesson,
        'ul',
        'ul.lessonId = cl.lessonId AND ul.userId = :userId AND ul.status = :pass',
        { userId, pass: LessonStatus.Pass },
      )
      .select('cl.courseId', 'courseId')
      .addSelect('COUNT(*)::int', 'totalLessons')
      .addSelect('COUNT(ul.lessonId)::int', 'passedLessons')
      .where('cl.courseId IN (:...courseIds)', { courseIds })
      .groupBy('cl.courseId')
      .getRawMany<{
        courseId: string;
        totalLessons: number;
        passedLessons: number;
      }>();

    for (const { courseId, totalLessons, passedLessons } of rows) {
      summaries.set(courseId, {
        totalLessons,
        passedLessons,
        percent: progressPercent(passedLessons, totalLessons),
      });
    }
    return summaries;
  }
}
