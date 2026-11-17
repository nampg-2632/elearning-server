import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/exceptions/error-code.enum';
import { isUniqueViolation } from '../common/utils/sql';
import { User } from '../users/entities/user.entity';
import { AuthProvider } from '../users/enums/auth-provider.enum';
import {
  USER_AVATAR_URL_MAX_LENGTH,
  USER_FULL_NAME_MAX_LENGTH,
} from '../users/users.constants';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { GoogleIdTokenDto } from './dto/google-id-token.dto';
import type { GoogleProfile } from './auth.types';
import { GoogleIdTokenVerifier } from './google-id-token.verifier';

// Sign in with Google. A Google account is matched by its `sub`, never by
// email: an email that already belongs to a password account is not linked
// automatically (whoever registered it may not own it); the owner logs in
// with the password and links Google from the profile.
@Injectable()
export class GoogleAuthService {
  constructor(
    private readonly verifier: GoogleIdTokenVerifier,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  async login(dto: GoogleIdTokenDto): Promise<AuthResponseDto> {
    const profile = await this.verify(dto.idToken);
    // Google vouches for the email only when it says it verified it.
    if (!profile.emailVerified) {
      throw new AppException({
        code: ErrorCode.GoogleEmailNotVerified,
        messageKey: 'errors.GOOGLE_EMAIL_NOT_VERIFIED',
        status: HttpStatus.FORBIDDEN,
      });
    }

    const linked = await this.usersService.findByIdentity(
      AuthProvider.Google,
      profile.sub,
    );
    if (linked) {
      return this.authService.issueToken(linked);
    }
    if (await this.usersService.existsByEmail(profile.email)) {
      throw this.accountExistsUsePassword();
    }

    let user: User;
    try {
      user = await this.usersService.createWithIdentity({
        email: profile.email,
        fullName: this.fullName(profile),
        avatarUrl: this.avatarUrl(profile),
        identity: {
          provider: AuthProvider.Google,
          providerUserId: profile.sub,
          email: profile.email,
        },
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // A concurrent request (e.g. a double click) created it first.
      const winner = await this.usersService.findByIdentity(
        AuthProvider.Google,
        profile.sub,
      );
      if (winner) return this.authService.issueToken(winner);
      throw this.accountExistsUsePassword();
    }
    return this.authService.issueToken(user);
  }

  // The user is logged in (proving the account) and signs in to Google
  // (proving that one), so both belong to the same person; the Google email
  // may differ from the account's.
  async link(user: User, dto: GoogleIdTokenDto): Promise<void> {
    const profile = await this.verify(dto.idToken);
    try {
      await this.usersService.linkIdentity(user.id, {
        provider: AuthProvider.Google,
        providerUserId: profile.sub,
        email: profile.email,
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // Linking the same Google account again changes nothing.
      const owner = await this.usersService.findByIdentity(
        AuthProvider.Google,
        profile.sub,
      );
      if (owner?.id === user.id) return;
      throw owner
        ? new AppException({
            code: ErrorCode.GoogleAccountAlreadyLinked,
            messageKey: 'errors.GOOGLE_ACCOUNT_ALREADY_LINKED',
            status: HttpStatus.CONFLICT,
          })
        : new AppException({
            code: ErrorCode.GoogleAlreadyLinked,
            messageKey: 'errors.GOOGLE_ALREADY_LINKED',
            status: HttpStatus.CONFLICT,
          });
    }
  }

  private async verify(idToken: string): Promise<GoogleProfile> {
    if (!this.verifier.enabled) {
      throw new AppException({
        code: ErrorCode.GoogleSignInDisabled,
        messageKey: 'errors.GOOGLE_SIGN_IN_DISABLED',
        status: HttpStatus.SERVICE_UNAVAILABLE,
      });
    }
    const profile = await this.verifier.verify(idToken);
    if (!profile) {
      throw new AppException({
        code: ErrorCode.InvalidGoogleToken,
        messageKey: 'errors.INVALID_GOOGLE_TOKEN',
        status: HttpStatus.UNAUTHORIZED,
      });
    }
    return profile;
  }

  private fullName(profile: GoogleProfile): string {
    const name = profile.name ?? profile.email.split('@')[0];
    return name.slice(0, USER_FULL_NAME_MAX_LENGTH);
  }

  private avatarUrl(profile: GoogleProfile): string | null {
    return profile.picture &&
      profile.picture.length <= USER_AVATAR_URL_MAX_LENGTH
      ? profile.picture
      : null;
  }

  private accountExistsUsePassword(): AppException {
    return new AppException({
      code: ErrorCode.AccountExistsUsePassword,
      messageKey: 'errors.ACCOUNT_EXISTS_USE_PASSWORD',
      status: HttpStatus.CONFLICT,
    });
  }
}
