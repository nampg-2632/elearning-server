import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { QueryFailedError } from 'typeorm';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/exceptions/error-code.enum';
import { describeError } from '../common/utils/describe-error';
import { hashPassword, verifyPassword } from '../common/utils/password';
import { appConfig } from '../config/app.config';
import { authConfig } from '../config/auth.config';
import { MailTemplate } from '../mail/enums/mail-template.enum';
import { MailService } from '../mail/mail.service';
import { RedisService } from '../redis/redis.service';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import {
  AUTH_MAIL_COOLDOWN_SECONDS,
  FORGOT_PASSWORD_PATH,
  RESET_PASSWORD_PATH,
  RESET_PASSWORD_TOKEN_TTL_SECONDS,
  VERIFY_EMAIL_PATH,
  VERIFY_EMAIL_TOKEN_TTL_SECONDS,
} from './auth.constants';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto, VerifyEmailDto } from './dto/token.dto';
import { blacklistKey, JwtPayload } from './jwt-payload';
import {
  OneTimeTokenPurpose,
  OneTimeTokenService,
} from './one-time-token.service';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // Verified against when the email is unknown, so both failure paths take
  // about the same time and do not reveal which emails are registered.
  private readonly dummyHash = hashPassword('dummy-password-for-timing');

  constructor(
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
    @Inject(appConfig.KEY)
    private readonly app: ConfigType<typeof appConfig>,
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
    private readonly usersService: UsersService,
    private readonly mail: MailService,
    private readonly tokens: OneTimeTokenService,
  ) {}

  // No token: the account can log in only after the email is verified.
  async register(dto: RegisterDto): Promise<UserResponseDto> {
    if (await this.usersService.existsByEmail(dto.email)) {
      throw this.emailAlreadyExists();
    }

    let user: User;
    try {
      user = await this.usersService.create({
        email: dto.email,
        passwordHash: await hashPassword(dto.password),
        fullName: dto.fullName,
      });
    } catch (error) {
      // Lost a race with a concurrent register for the same email.
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === PG_UNIQUE_VIOLATION
      ) {
        throw this.emailAlreadyExists();
      }
      throw error;
    }

    await this.sendVerificationMail(user);
    return UserResponseDto.fromEntity(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    const passwordHash = user?.passwordHash ?? (await this.dummyHash);
    const valid = await verifyPassword(passwordHash, dto.password);

    if (!user || !valid) {
      throw new AppException({
        code: ErrorCode.InvalidCredentials,
        messageKey: 'errors.INVALID_CREDENTIALS',
        status: HttpStatus.UNAUTHORIZED,
      });
    }
    // Checked only after the password, so this says nothing to someone who
    // does not know it. Each refused login re-sends the mail (at most once
    // per cooldown), which is how a user gets a new link after it expired.
    if (!user.emailVerifiedAt) {
      await this.sendVerificationMail(user);
      throw new AppException({
        code: ErrorCode.EmailNotVerified,
        messageKey: 'errors.EMAIL_NOT_VERIFIED',
        status: HttpStatus.FORBIDDEN,
      });
    }
    return this.issueToken(user);
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<void> {
    const data = await this.tokens.consume(
      OneTimeTokenPurpose.VerifyEmail,
      dto.token,
    );
    if (!data || !(await this.usersService.markEmailVerified(data.userId))) {
      throw new AppException({
        code: ErrorCode.InvalidVerificationToken,
        messageKey: 'errors.INVALID_VERIFICATION_TOKEN',
        status: HttpStatus.BAD_REQUEST,
      });
    }
  }

  // Says whether the email exists, like register's 409 already does; the
  // route is rate limited and mails an account at most once per cooldown
  // (a repeated request within it succeeds without a new mail).
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new AppException({
        code: ErrorCode.EmailNotFound,
        messageKey: 'errors.EMAIL_NOT_FOUND',
        status: HttpStatus.NOT_FOUND,
      });
    }

    const purpose = OneTimeTokenPurpose.ResetPassword;
    if (
      !(await this.tokens.startCooldown(
        purpose,
        user.id,
        AUTH_MAIL_COOLDOWN_SECONDS,
      ))
    ) {
      return;
    }
    const token = await this.tokens.issue(
      purpose,
      { userId: user.id, tokenVersion: user.tokenVersion },
      RESET_PASSWORD_TOKEN_TTL_SECONDS,
    );
    await this.mail.send({
      to: user.email,
      template: MailTemplate.ResetPassword,
      context: {
        fullName: user.fullName,
        email: user.email,
        link: this.frontendLink(RESET_PASSWORD_PATH, token),
        expiresInMinutes: RESET_PASSWORD_TOKEN_TTL_SECONDS / 60,
      },
    });
  }

  // Signs out every session and verifies the email (the link proves the
  // user reads it). Does not log in: the user does that with the new
  // password.
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const data = await this.tokens.consume(
      OneTimeTokenPurpose.ResetPassword,
      dto.token,
    );
    const user = data && (await this.usersService.findById(data.userId));
    if (
      !data ||
      !user ||
      !(await this.usersService.resetPassword(
        user.id,
        data.tokenVersion,
        await hashPassword(dto.newPassword),
      ))
    ) {
      throw new AppException({
        code: ErrorCode.InvalidResetToken,
        messageKey: 'errors.INVALID_RESET_TOKEN',
        status: HttpStatus.BAD_REQUEST,
      });
    }
    await this.sendPasswordChangedMail(user);
  }

  // Blacklists the token until it would have expired anyway.
  async logout(token: string): Promise<void> {
    const payload = this.jwtService.decode<JwtPayload | null>(token);
    const ttl = (payload?.exp ?? 0) - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.redis.set(blacklistKey(token), '1', ttl);
    }
  }

  // Signs out every session of the user (token_version is bumped), including
  // the one making the request, and returns a fresh token for it.
  async changePassword(
    user: User,
    dto: ChangePasswordDto,
  ): Promise<AuthResponseDto> {
    const oldHash = await this.usersService.findPasswordHash(user.id);
    if (!oldHash || !(await verifyPassword(oldHash, dto.currentPassword))) {
      throw this.invalidCurrentPassword();
    }

    const tokenVersion = await this.usersService.replacePassword(
      user.id,
      oldHash,
      await hashPassword(dto.newPassword),
    );
    if (tokenVersion === null) {
      // Changed by a concurrent request: the current password is stale.
      throw this.invalidCurrentPassword();
    }

    user.tokenVersion = tokenVersion;
    await this.sendPasswordChangedMail(user);
    return this.issueToken(user);
  }

  // A side effect like the mail itself: a Redis failure is logged and the
  // request still succeeds; the next login sends the mail again.
  private async sendVerificationMail(user: User): Promise<void> {
    const purpose = OneTimeTokenPurpose.VerifyEmail;
    try {
      if (
        !(await this.tokens.startCooldown(
          purpose,
          user.id,
          AUTH_MAIL_COOLDOWN_SECONDS,
        ))
      ) {
        return;
      }
      const token = await this.tokens.issue(
        purpose,
        { userId: user.id, tokenVersion: user.tokenVersion },
        VERIFY_EMAIL_TOKEN_TTL_SECONDS,
      );
      await this.mail.send({
        to: user.email,
        template: MailTemplate.VerifyEmail,
        context: {
          fullName: user.fullName,
          email: user.email,
          link: this.frontendLink(VERIFY_EMAIL_PATH, token),
          expiresInHours: VERIFY_EMAIL_TOKEN_TTL_SECONDS / 3600,
        },
      });
    } catch (error) {
      this.logger.error(
        `Cannot send the verification mail: ${describeError(error)}`,
      );
    }
  }

  private sendPasswordChangedMail(user: User): Promise<void> {
    return this.mail.send({
      to: user.email,
      template: MailTemplate.PasswordChanged,
      context: {
        fullName: user.fullName,
        email: user.email,
        forgotPasswordLink: `${this.app.frontendUrl}${FORGOT_PASSWORD_PATH}`,
      },
    });
  }

  private frontendLink(path: string, token: string): string {
    return `${this.app.frontendUrl}${path}?token=${token}`;
  }

  private async issueToken(user: User): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      tv: user.tokenVersion,
    };
    const accessToken = await this.jwtService.signAsync(payload);
    return {
      accessToken,
      expiresIn: this.config.jwtExpiresInSeconds,
      user: UserResponseDto.fromEntity(user),
    };
  }

  private invalidCurrentPassword(): AppException {
    return new AppException({
      code: ErrorCode.InvalidCurrentPassword,
      messageKey: 'errors.INVALID_CURRENT_PASSWORD',
      status: HttpStatus.BAD_REQUEST,
    });
  }

  private emailAlreadyExists(): AppException {
    return new AppException({
      code: ErrorCode.EmailAlreadyExists,
      messageKey: 'errors.EMAIL_ALREADY_EXISTS',
      status: HttpStatus.CONFLICT,
    });
  }
}
