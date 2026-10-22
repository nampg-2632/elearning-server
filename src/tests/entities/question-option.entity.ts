import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/base.entity';
import { Question } from './question.entity';

// Single choice: a partial unique index allows one correct option per question.
@Entity('question_options')
export class QuestionOption extends AppBaseEntity {
  @Column({ type: 'uuid' })
  questionId: string;

  @ManyToOne(() => Question, (question) => question.options, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'question_id' })
  question?: Question;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'boolean', default: false })
  isCorrect: boolean;

  @Column({ type: 'int' })
  position: number;
}
