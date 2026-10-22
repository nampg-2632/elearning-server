import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { TimestampedEntity } from '../../common/entities/base.entity';
import { Lesson } from '../../lessons/entities/lesson.entity';
import { Course } from './course.entity';

// Ordered n-n link between courses and lessons.
@Entity('course_lessons')
export class CourseLesson extends TimestampedEntity {
  @PrimaryColumn({ type: 'uuid' })
  courseId: string;

  @PrimaryColumn({ type: 'uuid' })
  lessonId: string;

  @Column({ type: 'int' })
  position: number;

  @ManyToOne(() => Course, (course) => course.courseLessons, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'course_id' })
  course?: Course;

  @ManyToOne(() => Lesson, (lesson) => lesson.courseLessons, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lesson_id' })
  lesson?: Lesson;
}
