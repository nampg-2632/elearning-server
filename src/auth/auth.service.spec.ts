import { HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { QueryFailedError } from 'typeorm';
import { UserRole } from '../common/enums/user-role.enum';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/exceptions/error-code.enum';
import { hashPassword, verifyPassword } from '../common/utils/password';
import { RedisService } from '../redis/redis.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { blacklistKey, JwtPayload } from './jwt-payload';

const SECRET = 'test-secret-test-secret-test-secret';
const EXPIRES_IN = 3600;

const buildUser = (overrides: Partial<User> = {}): User =>
  Object.assign(new User(), {
    id: '6f0c1a2b-0000-4000-8000-000000000001',
    email: 'nam@example.com',
    fullName: 'Nam',
    avatarUrl: null,
    role: UserRole.User,
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
    Pick<UsersService, 'existsByEmail' | 'create' | 'findByEmailWithPassword'>
  >;
  let redis: jest.Mocked<Pick<RedisService, 'set'>>;

  beforeEach(() => {
    jwtService = new JwtService({
      secret: SECRET,
      signOptions: { algorithm: 'HS256', expiresIn: EXPIRES_IN },
    });
    usersService = {
      existsByEmail: jest.fn(),
      create: jest.fn(),
      findByEmailWithPassword: jest.fn(),
    };
    redis = { set: jest.fn() };
    service = new AuthService(
      { jwtSecret: SECRET, jwtExpiresInSeconds: EXPIRES_IN },
      jwtService,
      redis as unknown as RedisService,
      usersService as unknown as UsersService,
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

  describe('logout', () => {
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
});
