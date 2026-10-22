import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { AttemptStatus } from '../enums/attempt-status.enum';
import { AttemptAnswer } from './attempt-answer.entity';
import { LessonTest } from './lesson-test.entity';

// Result columns are null while `doing` and required once `submitted`
// (check constraint). At most one `doing` attempt per user and test.
@Entity('test_attempts')
export class TestAttempt extends AppBaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'uuid' })
  testId: string;

  @ManyToOne(() => LessonTest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_id' })
  test?: LessonTest;

  @Column({
    type: 'enum',
    enum: AttemptStatus,
    enumName: 'attempt_status',
    default: AttemptStatus.Doing,
  })
  status: AttemptStatus;

  @Column({ type: 'int', nullable: true })
  score: number | null;

  @Column({ type: 'int', nullable: true })
  correctCount: number | null;

  @Column({ type: 'int' })
  totalQuestions: number;

  @Column({ type: 'boolean', nullable: true })
  passed: boolean | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @OneToMany(() => AttemptAnswer, (answer) => answer.attempt)
  answers?: AttemptAnswer[];
}
