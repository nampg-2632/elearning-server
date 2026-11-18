import { HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { QueryFailedError } from 'typeorm';
import { UserRole } from '../common/enums/user-role.enum';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/exceptions/error-code.enum';
import { hashPassword, verifyPassword } from '../common/utils/password';
import type { MailService } from '../mail/mail.service';
import { RedisService } from '../redis/redis.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { blacklistKey, JwtPayload } from './jwt-payload';
import { RefreshTokensService } from './refresh-tokens.service';

const SECRET = 'test-secret-test-secret-test-secret';
const EXPIRES_IN = 3600;
const REFRESH_EXPIRES_IN = 86400;
const SESSION_ID = '6f0c1a2b-0000-4000-8000-0000000000f1';

const buildUser = (overrides: Partial<User> = {}): User =>
  Object.assign(new User(), {
    id: '6f0c1a2b-0000-4000-8000-000000000001',
    email: 'nam@example.com',
    fullName: 'Nam',
    avatarUrl: null,
    role: UserRole.User,
    tokenVersion: 0,
    createdAt: new Date('2026-10-21T03:00:00.000Z'),
    updatedAt: new Date('2026-10-21T03:00:00.000Z'),
    ...overrides,
  });

const expectAppError = async (
  promise: Promise<unknown>,
  code: ErrorCode,
  status: HttpStatus,
) => {
  const error: unknown = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppException);
  expect((error as AppException).code).toBe(code);
  expect((error as AppException).getStatus()).toBe(status);
};

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let usersService: jest.Mocked<
    Pick<
      UsersService,
      | 'existsByEmail'
      | 'create'
      | 'findByEmailWithPassword'
      | 'findPasswordHash'
      | 'replacePassword'
      | 'findById'
      | 'bumpTokenVersion'
    >
  >;
  let refreshTokens: jest.Mocked<
    Pick<
      RefreshTokensService,
      'startSession' | 'rotate' | 'revokeSession' | 'revokeAllForUser'
    >
  >;
  let redis: jest.Mocked<Pick<RedisService, 'set'>>;
  let mail: { send: jest.Mock };

  beforeEach(() => {
    jwtService = new JwtService({
      secret: SECRET,
      signOptions: { algorithm: 'HS256', expiresIn: EXPIRES_IN },
    });
    usersService = {
      existsByEmail: jest.fn(),
      create: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      findPasswordHash: jest.fn(),
      replacePassword: jest.fn(),
      findById: jest.fn(),
      bumpTokenVersion: jest.fn(),
    };
    refreshTokens = {
      startSession: jest
        .fn()
        .mockResolvedValue({ token: 'refresh-1', sessionId: SESSION_ID }),
      rotate: jest.fn(),
      revokeSession: jest.fn(),
      revokeAllForUser: jest.fn(),
    };
    redis = { set: jest.fn() };
    mail = { send: jest.fn().mockResolvedValue(undefined) };
    service = new AuthService(
      {
        jwtSecret: SECRET,
        jwtExpiresInSeconds: EXPIRES_IN,
        refreshTokenExpiresInSeconds: REFRESH_EXPIRES_IN,
        googleClientIds: [],
      },
      jwtService,
      redis as unknown as RedisService,
      usersService as unknown as UsersService,
      mail as unknown as MailService,
      refreshTokens as unknown as RefreshTokensService,
    );
  });

  describe('register', () => {
    const dto = {
      email: 'nam@example.com',
      password: 'Secret123',
      fullName: 'Nam',
    };

    it('stores an argon2 hash and returns a token for the new user', async () => {
      usersService.existsByEmail.mockResolvedValue(false);
      usersService.create.mockImplementation((input) =>
        Promise.resolve(buildUser(input)),
      );

      const result = await service.register(dto);

      const input = usersService.create.mock.calls[0][0];
      expect(input.passwordHash).not.toBe(dto.password);
      expect(await verifyPassword(input.passwordHash, dto.password)).toBe(true);
      expect(result.expiresIn).toBe(EXPIRES_IN);
      expect(result.user).not.toHaveProperty('passwordHash');
      const payload = jwtService.verify<JwtPayload>(result.accessToken);
      expect(payload).toMatchObject({ sub: result.user.id, role: 'user' });
    });

    it('rejects an email that is already registered', async () => {
      usersService.existsByEmail.mockResolvedValue(true);

      await expectAppError(
        service.register(dto),
        ErrorCode.EmailAlreadyExists,
        HttpStatus.CONFLICT,
      );
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('maps a unique violation from a concurrent register to 409', async () => {
      usersService.existsByEmail.mockResolvedValue(false);
      usersService.create.mockRejectedValue(
        new QueryFailedError('INSERT', [], { code: '23505' } as never),
      );

      await expectAppError(
        service.register(dto),
        ErrorCode.EmailAlreadyExists,
        HttpStatus.CONFLICT,
      );
    });
  });

  describe('login', () => {
    it('returns a token when the password matches', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(
        buildUser({ passwordHash: await hashPassword('Secret123') }),
      );

      const result = await service.login({
        email: 'nam@example.com',
        password: 'Secret123',
      });

      expect(result.user.email).toBe('nam@example.com');
      const payload = jwtService.verify<JwtPayload>(result.accessToken);
      expect(payload).toMatchObject({ tv: 0, sid: SESSION_ID });
      expect(result).toMatchObject({
        refreshToken: 'refresh-1',
        refreshExpiresIn: REFRESH_EXPIRES_IN,
      });
      expect(refreshTokens.startSession).toHaveBeenCalledWith(result.user.id);
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('rejects a wrong password', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(
        buildUser({ passwordHash: await hashPassword('Secret123') }),
      );

      await expectAppError(
        service.login({ email: 'nam@example.com', password: 'Wrong1234' }),
        ErrorCode.InvalidCredentials,
        HttpStatus.UNAUTHORIZED,
      );
    });

    it('rejects an unknown email with the same error', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(null);

      await expectAppError(
        service.login({ email: 'nobody@example.com', password: 'Secret123' }),
        ErrorCode.InvalidCredentials,
        HttpStatus.UNAUTHORIZED,
      );
    });
  });

  describe('refresh', () => {
    it('returns a new pair for the same session', async () => {
      const user = buildUser({ tokenVersion: 2 });
      refreshTokens.rotate.mockResolvedValue({
        token: 'refresh-2',
        sessionId: SESSION_ID,
        userId: user.id,
      });
      usersService.findById.mockResolvedValue(user);

      const result = await service.refresh({ refreshToken: 'refresh-1' });

      expect(refreshTokens.rotate).toHaveBeenCalledWith('refresh-1');
      expect(refreshTokens.startSession).not.toHaveBeenCalled();
      expect(result.refreshToken).toBe('refresh-2');
      expect(result.expiresIn).toBe(EXPIRES_IN);
      const payload = jwtService.verify<JwtPayload>(result.accessToken);
      expect(payload).toMatchObject({ sub: user.id, tv: 2, sid: SESSION_ID });
    });

    it('rejects a token that cannot be rotated', async () => {
      refreshTokens.rotate.mockResolvedValue(null);

      await expectAppError(
        service.refresh({ refreshToken: 'used' }),
        ErrorCode.InvalidRefreshToken,
        HttpStatus.UNAUTHORIZED,
      );
      expect(usersService.findById).not.toHaveBeenCalled();
    });

    it('rejects a token whose user is gone', async () => {
      refreshTokens.rotate.mockResolvedValue({
        token: 'refresh-2',
        sessionId: SESSION_ID,
        userId: 'gone',
      });
      usersService.findById.mockResolvedValue(null);

      await expectAppError(
        service.refresh({ refreshToken: 'refresh-1' }),
        ErrorCode.InvalidRefreshToken,
        HttpStatus.UNAUTHORIZED,
      );
    });
  });

  describe('logoutAll', () => {
    it('revokes every refresh token and bumps the token version', async () => {
      const user = buildUser();

      await service.logoutAll(user);

      expect(refreshTokens.revokeAllForUser).toHaveBeenCalledWith(user.id);
      expect(usersService.bumpTokenVersion).toHaveBeenCalledWith(user.id);
    });
  });

  describe('logout', () => {
    it('revokes the refresh tokens of the session', async () => {
      const token = jwtService.sign({
        sub: 'u1',
        role: UserRole.User,
        sid: SESSION_ID,
      });

      await service.logout(token);

      expect(refreshTokens.revokeSession).toHaveBeenCalledWith(SESSION_ID);
      expect(redis.set).toHaveBeenCalled();
    });

    it('skips the refresh tokens for a token without a session', async () => {
      await service.logout(jwtService.sign({ sub: 'u1', role: UserRole.User }));

      expect(refreshTokens.revokeSession).not.toHaveBeenCalled();
    });

    it('blacklists the token for its remaining lifetime', async () => {
      const token = jwtService.sign({ sub: 'u1', role: UserRole.User });

      await service.logout(token);

      expect(redis.set).toHaveBeenCalledWith(
        blacklistKey(token),
        '1',
        expect.any(Number),
      );
      const ttl = redis.set.mock.calls[0][2]!;
      expect(ttl).toBeGreaterThan(EXPIRES_IN - 5);
      expect(ttl).toBeLessThanOrEqual(EXPIRES_IN);
    });

    it('does nothing for an already expired token', async () => {
      const token = new JwtService({ secret: SECRET }).sign({
        sub: 'u1',
        role: UserRole.User,
        exp: Math.floor(Date.now() / 1000) - 10,
      });

      await service.logout(token);

      expect(redis.set).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    const dto = { currentPassword: 'Secret123', newPassword: 'NewSecret456' };

    beforeEach(async () => {
      usersService.findPasswordHash.mockResolvedValue(
        await hashPassword('Secret123'),
      );
      usersService.replacePassword.mockResolvedValue(1);
    });

    it('stores the new hash and returns a token with the bumped version', async () => {
      const user = buildUser({ tokenVersion: 0 });

      const result = await service.changePassword(user, dto);

      const [id, oldHash, newHash] = usersService.replacePassword.mock.calls[0];
      expect(id).toBe(user.id);
      expect(await verifyPassword(oldHash, 'Secret123')).toBe(true);
      expect(await verifyPassword(newHash, 'NewSecret456')).toBe(true);
      const payload = jwtService.verify<JwtPayload>(result.accessToken);
      expect(payload).toMatchObject({ sub: user.id, tv: 1 });
      expect(result.user).not.toHaveProperty('tokenVersion');
      expect(refreshTokens.revokeAllForUser).toHaveBeenCalledWith(user.id);
      // The new session starts after the old ones are revoked.
      expect(
        refreshTokens.revokeAllForUser.mock.invocationCallOrder[0],
      ).toBeLessThan(refreshTokens.startSession.mock.invocationCallOrder[0]);
    });

    it('rejects a wrong current password without changing anything', async () => {
      await expectAppError(
        service.changePassword(buildUser(), {
          ...dto,
          currentPassword: 'Wrong1234',
        }),
        ErrorCode.InvalidCurrentPassword,
        HttpStatus.BAD_REQUEST,
      );
      expect(usersService.replacePassword).not.toHaveBeenCalled();
      expect(refreshTokens.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('rejects when a concurrent change replaced the hash first', async () => {
      usersService.replacePassword.mockResolvedValue(null);

      await expectAppError(
        service.changePassword(buildUser(), dto),
        ErrorCode.InvalidCurrentPassword,
        HttpStatus.BAD_REQUEST,
      );
    });
  });
});
