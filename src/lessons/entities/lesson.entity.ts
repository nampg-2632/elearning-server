import { Column, Entity, OneToMany, OneToOne } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/base.entity';
import { CourseLesson } from '../../courses/entities/course-lesson.entity';
import { LessonTest } from '../../tests/entities/lesson-test.entity';
import { LessonWord } from '../../words/entities/lesson-word.entity';

@Entity('lessons')
export class Lesson extends AppBaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @OneToMany(() => CourseLesson, (courseLesson) => courseLesson.lesson)
  courseLessons?: CourseLesson[];

  @OneToMany(() => LessonWord, (lessonWord) => lessonWord.lesson)
  lessonWords?: LessonWord[];

  @OneToOne(() => LessonTest, (test) => test.lesson)
  test?: LessonTest | null;
}
