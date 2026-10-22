import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { TimestampedEntity } from '../../common/entities/base.entity';
import { Question } from './question.entity';
import { QuestionOption } from './question-option.entity';
import { TestAttempt } from './test-attempt.entity';

// selectedOptionId = null means the question was left blank.
@Entity('attempt_answers')
export class AttemptAnswer extends TimestampedEntity {
  @PrimaryColumn({ type: 'uuid' })
  attemptId: string;

  @PrimaryColumn({ type: 'uuid' })
  questionId: string;

  @Column({ type: 'uuid', nullable: true })
  selectedOptionId: string | null;

  @Column({ type: 'boolean' })
  isCorrect: boolean;

  @ManyToOne(() => TestAttempt, (attempt) => attempt.answers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'attempt_id' })
  attempt?: TestAttempt;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question?: Question;

  @ManyToOne(() => QuestionOption, { nullable: true })
  @JoinColumn({ name: 'selected_option_id' })
  selectedOption?: QuestionOption | null;
}
