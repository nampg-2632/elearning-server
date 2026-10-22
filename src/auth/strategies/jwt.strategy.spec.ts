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
  const payload = { sub: 'u1', role: UserRole.User };
  const user = Object.assign(new User(), { id: 'u1', role: UserRole.User });

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
});
