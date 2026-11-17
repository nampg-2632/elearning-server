import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthIdentity } from './entities/auth-identity.entity';
import { User } from './entities/user.entity';
import { AuthProvider } from './enums/auth-provider.enum';
import type {
  CreateUserInput,
  CreateUserWithIdentityInput,
  AuthIdentityInput,
  UpdateProfileInput,
} from './users.types';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(AuthIdentity)
    private readonly identities: Repository<AuthIdentity>,
  ) {}

  // The user an outside account logs in as, if it was linked.
  async findByIdentity(
    provider: AuthProvider,
    providerUserId: string,
  ): Promise<User | null> {
    const identity = await this.identities.findOneBy({
      provider,
      providerUserId,
    });
    return identity ? this.findById(identity.userId) : null;
  }

  // Throws a unique violation when the outside account is linked already,
  // or the user already has one from this provider.
  async linkIdentity(
    userId: string,
    identity: AuthIdentityInput,
  ): Promise<void> {
    await this.identities.insert({ userId, ...identity });
  }

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

  // One transaction, so a failed identity insert leaves no user behind.
  // Throws a unique violation when the email or the identity is taken.
  createWithIdentity({
    identity,
    ...input
  }: CreateUserWithIdentityInput): Promise<User> {
    return this.users.manager.transaction(async (manager) => {
      const user = await manager.save(
        manager.create(User, {
          ...input,
          role: UserRole.User,
          passwordHash: null,
          tokenVersion: 0,
        }),
      );
      await manager.insert(AuthIdentity, { userId: user.id, ...identity });
      return user;
    });
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
