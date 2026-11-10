import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { UserRole } from '../../common/enums/user-role.enum';
import { RedisService } from '../../redis/redis.service';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { blacklistKey } from '../jwt-payload';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const token = 'header.payload.signature';
  const request = {
    headers: { authorization: `Bearer ${token}` },
  } as Request;
  const payload = { sub: 'u1', role: UserRole.User, tv: 2 };
  const user = Object.assign(new User(), {
    id: 'u1',
    role: UserRole.User,
    tokenVersion: 2,
  });

  let strategy: JwtStrategy;
  let redis: jest.Mocked<Pick<RedisService, 'exists'>>;
  let usersService: jest.Mocked<Pick<UsersService, 'findById'>>;

  beforeEach(() => {
    redis = { exists: jest.fn().mockResolvedValue(false) };
    usersService = { findById: jest.fn().mockResolvedValue(user) };
    strategy = new JwtStrategy(
      { jwtSecret: 'x'.repeat(32), jwtExpiresInSeconds: 3600 },
      redis as unknown as RedisService,
      usersService as unknown as UsersService,
    );
  });

  it('returns the user for a valid, not revoked token', async () => {
    await expect(strategy.validate(request, payload)).resolves.toBe(user);
    expect(redis.exists).toHaveBeenCalledWith(blacklistKey(token));
  });

  it('rejects a logged-out token', async () => {
    redis.exists.mockResolvedValue(true);

    await expect(strategy.validate(request, payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(usersService.findById).not.toHaveBeenCalled();
  });

  it('rejects a token whose user no longer exists', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(strategy.validate(request, payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token issued before the last password change', async () => {
    await expect(
      strategy.validate(request, { ...payload, tv: 1 }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('treats a token without tv as version 0', async () => {
    const legacy = { sub: 'u1', role: UserRole.User };
    usersService.findById.mockResolvedValue(
      Object.assign(new User(), { ...user, tokenVersion: 0 }),
    );
    await expect(strategy.validate(request, legacy)).resolves.toMatchObject({
      id: 'u1',
    });

    usersService.findById.mockResolvedValue(user);
    await expect(strategy.validate(request, legacy)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
