import { Column, Entity } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/base.entity';
import { UserRole } from '../../common/enums/user-role.enum';

// Email uniqueness is case-insensitive (unique index on LOWER(email)).
@Entity('users')
export class User extends AppBaseEntity {
  @Column({ type: 'varchar', length: 320 })
  email: string;

  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash: string;

  @Column({ type: 'varchar', length: 100 })
  fullName: string;

  @Column({ type: 'text', nullable: true })
  avatarUrl: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role',
    default: UserRole.User,
  })
  role: UserRole;
}
