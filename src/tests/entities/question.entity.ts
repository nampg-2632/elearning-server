import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/base.entity';
import { LessonTest } from './lesson-test.entity';
import { QuestionOption } from './question-option.entity';

@Entity('questions')
export class Question extends AppBaseEntity {
  @Column({ type: 'uuid' })
  testId: string;

  @ManyToOne(() => LessonTest, (test) => test.questions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'test_id' })
  test?: LessonTest;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int' })
  position: number;

  @OneToMany(() => QuestionOption, (option) => option.question)
  options?: QuestionOption[];
}
