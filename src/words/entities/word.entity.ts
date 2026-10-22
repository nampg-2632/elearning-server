import { Column, Entity, OneToMany } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/base.entity';
import { LessonWord } from './lesson-word.entity';

@Entity('words')
export class Word extends AppBaseEntity {
  @Column({ type: 'varchar', length: 255 })
  content: string;

  @Column({ type: 'text' })
  meaning: string;

  @OneToMany(() => LessonWord, (lessonWord) => lessonWord.word)
  lessonWords?: LessonWord[];
}
