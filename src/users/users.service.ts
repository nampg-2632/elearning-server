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

export type UpdateProfileInput = {
  fullName?: string;
  avatarUrl?: string | null;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  // passwordHash is not selected by default, so it is opted in here.
  findPasswordHash(id: string): Promise<string | null> {
    return this.users
      .createQueryBuilder('user')
      .select('user.passwordHash', 'passwordHash')
      .where('user.id = :id', { id })
      .getRawOne<{ passwordHash: string }>()
      .then((row) => row?.passwordHash ?? null);
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

  // undefined = not sent (keep), null = clear (avatarUrl only).
  async updateProfile(user: User, input: UpdateProfileInput): Promise<User> {
    if (input.fullName !== undefined) user.fullName = input.fullName;
    if (input.avatarUrl !== undefined) user.avatarUrl = input.avatarUrl;
    return this.users.save(user);
  }

  // Sets the new hash and bumps token_version, revoking every issued token.
  // Compare-and-set on the old hash: of two concurrent changes made with the
  // same current password only one wins; the other gets null.
  async replacePassword(
    id: string,
    oldHash: string,
    newHash: string,
  ): Promise<number | null> {
    const result = await this.users
      .createQueryBuilder()
      .update(User)
      .set({ passwordHash: newHash, tokenVersion: () => 'token_version + 1' })
      .where('id = :id AND password_hash = :oldHash', { id, oldHash })
      .returning('token_version')
      .execute();
    const rows = result.raw as { token_version: number }[];
    return rows.length === 1 ? rows[0].token_version : null;
  }

  create(input: CreateUserInput): Promise<User> {
    return this.users.save(
      this.users.create({
        role: UserRole.User,
        avatarUrl: null,
        tokenVersion: 0,
        ...input,
      }),
    );
  }
}
