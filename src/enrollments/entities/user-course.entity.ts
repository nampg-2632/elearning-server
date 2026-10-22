import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/base.entity';
import { Course } from '../../courses/entities/course.entity';
import { User } from '../../users/entities/user.entity';
import { EnrollmentStatus } from '../enums/enrollment-status.enum';

// One row per (user, course). Transitions: pending -> approved | rejected,
// approved -> rejected (revoke), rejected -> pending (re-enroll).
@Entity('user_courses')
export class UserCourse extends AppBaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'uuid' })
  courseId: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course?: Course;

  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    enumName: 'enrollment_status',
    default: EnrollmentStatus.Pending,
  })
  status: EnrollmentStatus;

  @Column({ type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer?: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectReason: string | null;
}
