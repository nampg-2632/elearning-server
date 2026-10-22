import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { TimestampedEntity } from '../../common/entities/base.entity';
import { Lesson } from '../../lessons/entities/lesson.entity';
import { Word } from './word.entity';

// Ordered n-n link between lessons and words. "Learned" is per user and
// derived from user_lessons (status = pass), so there is no status here.
@Entity('lesson_words')
export class LessonWord extends TimestampedEntity {
  @PrimaryColumn({ type: 'uuid' })
  lessonId: string;

  @PrimaryColumn({ type: 'uuid' })
  wordId: string;

  @Column({ type: 'int' })
  position: number;

  @ManyToOne(() => Lesson, (lesson) => lesson.lessonWords, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lesson_id' })
  lesson?: Lesson;

  @ManyToOne(() => Word, (word) => word.lessonWords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'word_id' })
  word?: Word;
}
