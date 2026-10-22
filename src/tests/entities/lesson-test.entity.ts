import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/base.entity';
import { Lesson } from '../../lessons/entities/lesson.entity';
import { Question } from './question.entity';

// Table `tests`; named LessonTest to avoid clashing with Nest's `Test`
// helper in spec files. One test per lesson.
@Entity('tests')
export class LessonTest extends AppBaseEntity {
  @Column({ type: 'uuid', unique: true })
  lessonId: string;

  @OneToOne(() => Lesson, (lesson) => lesson.test, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson?: Lesson;

  @Column({ type: 'int', default: 80 })
  passScore: number;

  @OneToMany(() => Question, (question) => question.test)
  questions?: Question[];
}
