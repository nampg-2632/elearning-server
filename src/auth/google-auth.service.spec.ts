import { HttpStatus } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { UserRole } from '../common/enums/user-role.enum';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/exceptions/error-code.enum';
import { User } from '../users/entities/user.entity';
import { AuthProvider } from '../users/enums/auth-provider.enum';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';
import type { GoogleProfile } from './auth.types';
import { GoogleIdTokenVerifier } from './google-id-token.verifier';

const ID_TOKEN = 'header.payload.signature';

const profile = (overrides: Partial<GoogleProfile> = {}): GoogleProfile => ({
  sub: '1234567890',
  email: 'nam@gmail.com',
  emailVerified: true,
  name: 'Nam Google',
  picture: 'https://lh3.googleusercontent.com/a/photo',
  ...overrides,
});

const buildUser = (overrides: Partial<User> = {}): User =>
  Object.assign(new User(), {
    id: '6f0c1a2b-0000-4000-8000-000000000001',
    email: 'nam@gmail.com',
    fullName: 'Nam',
    avatarUrl: null,
    role: UserRole.User,
    tokenVersion: 0,
    ...overrides,
  });

const uniqueViolation = () =>
  new QueryFailedError('INSERT', [], { code: '23505' } as never);

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

describe('GoogleAuthService', () => {
  let service: GoogleAuthService;
  let verifier: { enabled: boolean; verify: jest.Mock };
  let usersService: jest.Mocked<
    Pick<
      UsersService,
      'findByIdentity' | 'existsByEmail' | 'createWithIdentity' | 'linkIdentity'
    >
  >;
  let authService: { issueToken: jest.Mock };

  beforeEach(() => {
    verifier = {
      enabled: true,
      verify: jest.fn().mockResolvedValue(profile()),
    };
    usersService = {
      findByIdentity: jest.fn().mockResolvedValue(null),
      existsByEmail: jest.fn().mockResolvedValue(false),
      createWithIdentity: jest.fn((input) =>
        Promise.resolve(buildUser({ email: input.email })),
      ),
      linkIdentity: jest.fn().mockResolvedValue(undefined),
    };
    authService = {
      issueToken: jest.fn((user: User) =>
        Promise.resolve({ accessToken: `token-of-${user.id}` }),
      ),
    };
    service = new GoogleAuthService(
      verifier as unknown as GoogleIdTokenVerifier,
      usersService as unknown as UsersService,
      authService as unknown as AuthService,
    );
  });

  describe('login', () => {
    it('logs in the user linked to the Google sub', async () => {
      const linked = buildUser({ email: 'other@example.com' });
      usersService.findByIdentity.mockResolvedValue(linked);

      await expect(service.login({ idToken: ID_TOKEN })).resolves.toEqual({
        accessToken: `token-of-${linked.id}`,
      });
      expect(verifier.verify).toHaveBeenCalledWith(ID_TOKEN);
      expect(usersService.findByIdentity).toHaveBeenCalledWith(
        AuthProvider.Google,
        '1234567890',
      );
      expect(usersService.createWithIdentity).not.toHaveBeenCalled();
    });

    it('creates an account without a password on first login', async () => {
      await service.login({ idToken: ID_TOKEN });

      expect(usersService.createWithIdentity).toHaveBeenCalledWith({
        email: 'nam@gmail.com',
        fullName: 'Nam Google',
        avatarUrl: 'https://lh3.googleusercontent.com/a/photo',
        identity: {
          provider: AuthProvider.Google,
          providerUserId: '1234567890',
          email: 'nam@gmail.com',
        },
      });
      expect(authService.issueToken).toHaveBeenCalled();
    });

    it('names the account after the email when Google has no name', async () => {
      verifier.verify.mockResolvedValue(profile({ name: null, picture: null }));

      await service.login({ idToken: ID_TOKEN });

      expect(usersService.createWithIdentity).toHaveBeenCalledWith(
        expect.objectContaining({ fullName: 'nam', avatarUrl: null }),
      );
    });

    it('does not link an email that belongs to a password account', async () => {
      usersService.existsByEmail.mockResolvedValue(true);

      await expectAppError(
        service.login({ idToken: ID_TOKEN }),
        ErrorCode.AccountExistsUsePassword,
        HttpStatus.CONFLICT,
      );
      expect(usersService.createWithIdentity).not.toHaveBeenCalled();
      expect(authService.issueToken).not.toHaveBeenCalled();
    });

    it('refuses an email Google has not verified', async () => {
      verifier.verify.mockResolvedValue(profile({ emailVerified: false }));

      await expectAppError(
        service.login({ idToken: ID_TOKEN }),
        ErrorCode.GoogleEmailNotVerified,
        HttpStatus.FORBIDDEN,
      );
      expect(usersService.findByIdentity).not.toHaveBeenCalled();
    });

    it('rejects an invalid token', async () => {
      verifier.verify.mockResolvedValue(null);

      await expectAppError(
        service.login({ idToken: ID_TOKEN }),
        ErrorCode.InvalidGoogleToken,
        HttpStatus.UNAUTHORIZED,
      );
    });

    it('answers 503 when no client ID is configured', async () => {
      verifier.enabled = false;

      await expectAppError(
        service.login({ idToken: ID_TOKEN }),
        ErrorCode.GoogleSignInDisabled,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
      expect(verifier.verify).not.toHaveBeenCalled();
    });

    it('logs in the account a concurrent first login created', async () => {
      const winner = buildUser();
      usersService.createWithIdentity.mockRejectedValue(uniqueViolation());
      usersService.findByIdentity
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(winner);

      await expect(service.login({ idToken: ID_TOKEN })).resolves.toEqual({
        accessToken: `token-of-${winner.id}`,
      });
    });

    it('maps an email taken concurrently by a password account to 409', async () => {
      usersService.createWithIdentity.mockRejectedValue(uniqueViolation());

      await expectAppError(
        service.login({ idToken: ID_TOKEN }),
        ErrorCode.AccountExistsUsePassword,
        HttpStatus.CONFLICT,
      );
    });
  });

  describe('link', () => {
    const user = buildUser({ email: 'nam@example.com' });

    it('links the Google sub to the logged-in user', async () => {
      await service.link(user, { idToken: ID_TOKEN });

      expect(usersService.linkIdentity).toHaveBeenCalledWith(user.id, {
        provider: AuthProvider.Google,
        providerUserId: '1234567890',
        email: 'nam@gmail.com',
      });
    });

    it('accepts a Google account whose email Google has not verified', async () => {
      verifier.verify.mockResolvedValue(profile({ emailVerified: false }));

      await expect(
        service.link(user, { idToken: ID_TOKEN }),
      ).resolves.toBeUndefined();
    });

    it('does nothing when the same Google account is linked again', async () => {
      usersService.linkIdentity.mockRejectedValue(uniqueViolation());
      usersService.findByIdentity.mockResolvedValue(user);

      await expect(
        service.link(user, { idToken: ID_TOKEN }),
      ).resolves.toBeUndefined();
    });

    it('refuses a Google account linked to another user', async () => {
      usersService.linkIdentity.mockRejectedValue(uniqueViolation());
      usersService.findByIdentity.mockResolvedValue(
        buildUser({ id: '6f0c1a2b-0000-4000-8000-000000000002' }),
      );

      await expectAppError(
        service.link(user, { idToken: ID_TOKEN }),
        ErrorCode.GoogleAccountAlreadyLinked,
        HttpStatus.CONFLICT,
      );
    });

    it('refuses a second Google account for the same user', async () => {
      usersService.linkIdentity.mockRejectedValue(uniqueViolation());

      await expectAppError(
        service.link(user, { idToken: ID_TOKEN }),
        ErrorCode.GoogleAlreadyLinked,
        HttpStatus.CONFLICT,
      );
    });

    it('rejects an invalid token', async () => {
      verifier.verify.mockResolvedValue(null);

      await expectAppError(
        service.link(user, { idToken: ID_TOKEN }),
        ErrorCode.InvalidGoogleToken,
        HttpStatus.UNAUTHORIZED,
      );
      expect(usersService.linkIdentity).not.toHaveBeenCalled();
    });
  });
});
