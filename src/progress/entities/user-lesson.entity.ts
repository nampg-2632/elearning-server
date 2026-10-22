import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { TimestampedEntity } from '../../common/entities/base.entity';
import { Lesson } from '../../lessons/entities/lesson.entity';
import { User } from '../../users/entities/user.entity';
import { LessonStatus } from '../enums/lesson-status.enum';

// A user's test status per lesson; no row means `todo`. Shared across
// courses, so passing a lesson in one course counts in every course.
@Entity('user_lessons')
export class UserLesson extends TimestampedEntity {
  @PrimaryColumn({ type: 'uuid' })
  userId: string;

  @PrimaryColumn({ type: 'uuid' })
  lessonId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson?: Lesson;

  @Column({
    type: 'enum',
    enum: LessonStatus,
    enumName: 'lesson_status',
    default: LessonStatus.Todo,
  })
  status: LessonStatus;

  @Column({ type: 'int', nullable: true })
  bestScore: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  passedAt: Date | null;
}
