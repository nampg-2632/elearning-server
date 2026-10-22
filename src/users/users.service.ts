import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from './entities/user.entity';

export type CreateUserInput = {
  email: string;
  passwordHash: string;
  fullName: string;
  role?: UserRole;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  // Case-insensitive, matching the unique index on LOWER(email).
  // passwordHash is not selected by default, so it is opted in here.
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.users
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getExists();
  }

  create(input: CreateUserInput): Promise<User> {
    return this.users.save(
      this.users.create({ role: UserRole.User, avatarUrl: null, ...input }),
    );
  }
}
