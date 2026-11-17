import { HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { QueryFailedError } from 'typeorm';
import { UserRole } from '../common/enums/user-role.enum';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/exceptions/error-code.enum';
import { hashPassword, verifyPassword } from '../common/utils/password';
import { MailTemplate } from '../mail/enums/mail-template.enum';
import type { MailService } from '../mail/mail.service';
import type { MailJob } from '../mail/mail.types';
import { RedisService } from '../redis/redis.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { blacklistKey, JwtPayload } from './jwt-payload';
import {
  OneTimeTokenPurpose,
  OneTimeTokenService,
} from './one-time-token.service';

const SECRET = 'test-secret-test-secret-test-secret';
const EXPIRES_IN = 3600;
const FRONTEND_URL = 'https://app.example.com';

// The commands the auth flows use, kept in a Map (TTLs are ignored).
class FakeRedis {
  readonly store = new Map<string, string>();
  set = jest.fn((key: string, value: string, _ttlSeconds?: number) => {
    this.store.set(key, value);
    return Promise.resolve();
  });
  setJson(key: string, value: unknown): Promise<void> {
    return this.set(key, JSON.stringify(value));
  }
  setIfAbsent(key: string, value: string): Promise<boolean> {
    if (this.store.has(key)) return Promise.resolve(false);
    this.store.set(key, value);
    return Promise.resolve(true);
  }
  getDel(key: string): Promise<string | null> {
    const value = this.store.get(key) ?? null;
    this.store.delete(key);
    return Promise.resolve(value);
  }
}

// The token is the last part of the link in the mail.
const tokenFromLink = (link: string): string =>
  new URL(link).searchParams.get('token')!;

const buildUser = (overrides: Partial<User> = {}): User =>
  Object.assign(new User(), {
    id: '6f0c1a2b-0000-4000-8000-000000000001',
    email: 'nam@example.com',
    fullName: 'Nam',
    avatarUrl: null,
    role: UserRole.User,
    tokenVersion: 0,
    emailVerifiedAt: new Date('2026-10-21T03:05:00.000Z'),
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
      | 'findById'
      | 'findByEmail'
      | 'findByEmailWithPassword'
      | 'findPasswordHash'
      | 'replacePassword'
      | 'markEmailVerified'
      | 'resetPassword'
    >
  >;
  let redis: FakeRedis;
  let tokens: OneTimeTokenService;
  let mail: { send: jest.Mock<Promise<void>, [MailJob]> };

  // Link of the only mail of this template sent so far.
  const mailedLink = (template: MailTemplate): string => {
    const jobs = mail.send.mock.calls
      .map(([job]) => job)
      .filter((job) => job.template === template);
    expect(jobs).toHaveLength(1);
    return (jobs[0].context as { link: string }).link;
  };

  beforeEach(() => {
    jwtService = new JwtService({
      secret: SECRET,
      signOptions: { algorithm: 'HS256', expiresIn: EXPIRES_IN },
    });
    usersService = {
      existsByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      findPasswordHash: jest.fn(),
      replacePassword: jest.fn(),
      markEmailVerified: jest.fn(),
      resetPassword: jest.fn(),
    };
    redis = new FakeRedis();
    tokens = new OneTimeTokenService(redis as unknown as RedisService);
    mail = {
      send: jest.fn<Promise<void>, [MailJob]>().mockResolvedValue(undefined),
    };
    service = new AuthService(
      { jwtSecret: SECRET, jwtExpiresInSeconds: EXPIRES_IN },
      { frontendUrl: FRONTEND_URL } as never,
      jwtService,
      redis as unknown as RedisService,
      usersService as unknown as UsersService,
      mail as unknown as MailService,
      tokens,
    );
  });

  describe('register', () => {
    const dto = {
      email: 'nam@example.com',
      password: 'Secret123',
      fullName: 'Nam',
    };

    beforeEach(() => {
      usersService.existsByEmail.mockResolvedValue(false);
      usersService.create.mockImplementation((input) =>
        Promise.resolve(buildUser({ ...input, emailVerifiedAt: null })),
      );
    });

    it('stores an argon2 hash and returns the user without a token', async () => {
      const result = await service.register(dto);

      const input = usersService.create.mock.calls[0][0];
      expect(input.passwordHash).not.toBe(dto.password);
      expect(await verifyPassword(input.passwordHash, dto.password)).toBe(true);
      expect(result).toMatchObject({
        email: 'nam@example.com',
        fullName: 'Nam',
      });
      expect(result).not.toHaveProperty('accessToken');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('mails a verification link to the frontend page', async () => {
      await service.register(dto);

      expect(mail.send).toHaveBeenCalledWith({
        to: 'nam@example.com',
        template: MailTemplate.VerifyEmail,
        context: {
          fullName: 'Nam',
          email: 'nam@example.com',
          link: expect.stringMatching(
            /^https:\/\/app\.example\.com\/verify-email\?token=[\w-]{43}$/,
          ) as unknown,
          expiresInHours: 24,
        },
      });
    });

    it('keeps only a hash of the token in Redis', async () => {
      await service.register(dto);

      const token = tokenFromLink(mailedLink(MailTemplate.VerifyEmail));
      const keys = [...redis.store.keys()].join(' ');
      expect(keys).not.toContain(token);
      expect(keys).toMatch(/auth:verify-email:token:[0-9a-f]{64}/);
    });

    it('still registers when the token cannot be stored', async () => {
      jest
        .spyOn(tokens, 'startCooldown')
        .mockRejectedValue(new Error('Redis down'));

      await expect(service.register(dto)).resolves.toMatchObject({
        email: 'nam@example.com',
      });
      expect(mail.send).not.toHaveBeenCalled();
    });

    it('rejects an email that is already registered', async () => {
      usersService.existsByEmail.mockReset().mockResolvedValue(true);

      await expectAppError(
        service.register(dto),
        ErrorCode.EmailAlreadyExists,
        HttpStatus.CONFLICT,
      );
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('maps a unique violation from a concurrent register to 409', async () => {
      usersService.create
        .mockReset()
        .mockRejectedValue(
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
      expect(jwtService.verify<JwtPayload>(result.accessToken).tv).toBe(0);
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

    describe('with an unverified email', () => {
      const credentials = { email: 'nam@example.com', password: 'Secret123' };

      beforeEach(async () => {
        usersService.findByEmailWithPassword.mockResolvedValue(
          buildUser({
            emailVerifiedAt: null,
            passwordHash: await hashPassword('Secret123'),
          }),
        );
      });

      it('refuses the right password and mails a new verification link', async () => {
        await expectAppError(
          service.login(credentials),
          ErrorCode.EmailNotVerified,
          HttpStatus.FORBIDDEN,
        );
        mailedLink(MailTemplate.VerifyEmail);
      });

      it('mails at most once per cooldown', async () => {
        for (let i = 0; i < 3; i++) {
          await service.login(credentials).catch(() => undefined);
        }
        expect(mail.send).toHaveBeenCalledTimes(1);
      });

      it('says nothing about verification to a wrong password', async () => {
        await expectAppError(
          service.login({ ...credentials, password: 'Wrong1234' }),
          ErrorCode.InvalidCredentials,
          HttpStatus.UNAUTHORIZED,
        );
        expect(mail.send).not.toHaveBeenCalled();
      });
    });
  });

  describe('verifyEmail', () => {
    const user = buildUser({ emailVerifiedAt: null });

    const issueLink = async (): Promise<string> => {
      usersService.findByEmailWithPassword.mockResolvedValue(
        Object.assign(buildUser({ emailVerifiedAt: null }), {
          passwordHash: await hashPassword('Secret123'),
        }),
      );
      await service
        .login({ email: user.email, password: 'Secret123' })
        .catch(() => undefined);
      return tokenFromLink(mailedLink(MailTemplate.VerifyEmail));
    };

    it('marks the email verified once per mailed token', async () => {
      usersService.markEmailVerified.mockResolvedValue(true);
      const token = await issueLink();

      await service.verifyEmail({ token });

      expect(usersService.markEmailVerified).toHaveBeenCalledWith(user.id);
      await expectAppError(
        service.verifyEmail({ token }),
        ErrorCode.InvalidVerificationToken,
        HttpStatus.BAD_REQUEST,
      );
    });

    it('rejects an unknown token', async () => {
      await expectAppError(
        service.verifyEmail({ token: 'not-a-token' }),
        ErrorCode.InvalidVerificationToken,
        HttpStatus.BAD_REQUEST,
      );
      expect(usersService.markEmailVerified).not.toHaveBeenCalled();
    });

    it('rejects the token of a deleted user', async () => {
      usersService.markEmailVerified.mockResolvedValue(false);
      const token = await issueLink();

      await expectAppError(
        service.verifyEmail({ token }),
        ErrorCode.InvalidVerificationToken,
        HttpStatus.BAD_REQUEST,
      );
    });
  });

  describe('forgotPassword', () => {
    const user = buildUser({ tokenVersion: 3 });

    it('rejects an unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expectAppError(
        service.forgotPassword({ email: 'nobody@example.com' }),
        ErrorCode.EmailNotFound,
        HttpStatus.NOT_FOUND,
      );
      expect(mail.send).not.toHaveBeenCalled();
    });

    it('mails a reset link valid for 30 minutes', async () => {
      usersService.findByEmail.mockResolvedValue(user);

      await service.forgotPassword({ email: user.email });

      expect(mail.send).toHaveBeenCalledWith({
        to: user.email,
        template: MailTemplate.ResetPassword,
        context: {
          fullName: user.fullName,
          email: user.email,
          link: expect.stringMatching(
            /^https:\/\/app\.example\.com\/reset-password\?token=[\w-]{43}$/,
          ) as unknown,
          expiresInMinutes: 30,
        },
      });
    });

    it('mails at most once per cooldown', async () => {
      usersService.findByEmail.mockResolvedValue(user);

      await service.forgotPassword({ email: user.email });
      await service.forgotPassword({ email: user.email });

      expect(mail.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetPassword', () => {
    const user = buildUser({ tokenVersion: 3, emailVerifiedAt: null });

    const issueToken = async (): Promise<string> => {
      usersService.findByEmail.mockResolvedValue(user);
      await service.forgotPassword({ email: user.email });
      return tokenFromLink(mailedLink(MailTemplate.ResetPassword));
    };

    beforeEach(() => {
      usersService.findById.mockResolvedValue(user);
      usersService.resetPassword.mockResolvedValue(true);
    });

    it('stores the new hash for the token version the link was issued at', async () => {
      const token = await issueToken();

      await service.resetPassword({ token, newPassword: 'NewSecret456' });

      const [id, tokenVersion, hash] = usersService.resetPassword.mock.calls[0];
      expect(id).toBe(user.id);
      expect(tokenVersion).toBe(3);
      expect(await verifyPassword(hash, 'NewSecret456')).toBe(true);
    });

    it('mails that the password changed', async () => {
      const token = await issueToken();

      await service.resetPassword({ token, newPassword: 'NewSecret456' });

      expect(mail.send).toHaveBeenLastCalledWith({
        to: user.email,
        template: MailTemplate.PasswordChanged,
        context: {
          fullName: user.fullName,
          email: user.email,
          forgotPasswordLink: `${FRONTEND_URL}/forgot-password`,
        },
      });
    });

    it('accepts a token only once', async () => {
      const token = await issueToken();
      await service.resetPassword({ token, newPassword: 'NewSecret456' });

      await expectAppError(
        service.resetPassword({ token, newPassword: 'Other7890' }),
        ErrorCode.InvalidResetToken,
        HttpStatus.BAD_REQUEST,
      );
      expect(usersService.resetPassword).toHaveBeenCalledTimes(1);
    });

    it('rejects a link issued before the password last changed', async () => {
      usersService.resetPassword.mockResolvedValue(false);
      const token = await issueToken();

      await expectAppError(
        service.resetPassword({ token, newPassword: 'NewSecret456' }),
        ErrorCode.InvalidResetToken,
        HttpStatus.BAD_REQUEST,
      );
      expect(mail.send).toHaveBeenCalledTimes(1);
    });

    it('rejects an unknown token', async () => {
      await expectAppError(
        service.resetPassword({ token: 'nope', newPassword: 'NewSecret456' }),
        ErrorCode.InvalidResetToken,
        HttpStatus.BAD_REQUEST,
      );
    });

    it('does not accept a verification token', async () => {
      const token = await tokens.issue(
        OneTimeTokenPurpose.VerifyEmail,
        { userId: user.id, tokenVersion: 3 },
        60,
      );

      await expectAppError(
        service.resetPassword({ token, newPassword: 'NewSecret456' }),
        ErrorCode.InvalidResetToken,
        HttpStatus.BAD_REQUEST,
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
      expect(mail.send).toHaveBeenCalledWith(
        expect.objectContaining({ template: MailTemplate.PasswordChanged }),
      );
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
      expect(mail.send).not.toHaveBeenCalled();
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
