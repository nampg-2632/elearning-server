import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/exceptions/error-code.enum';
import { hashPassword, verifyPassword } from '../common/utils/password';
import { isUniqueViolation } from '../common/utils/sql';
import { authConfig } from '../config/auth.config';
import { MailTemplate } from '../mail/enums/mail-template.enum';
import { MailService } from '../mail/mail.service';
import { RedisService } from '../redis/redis.service';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { blacklistKey, JwtPayload } from './jwt-payload';
import type { IssuedRefreshToken } from './auth.types';
import { RefreshTokensService } from './refresh-tokens.service';

@Injectable()
export class AuthService {
  // Verified against when the email is unknown, so both failure paths take
  // about the same time and do not reveal which emails are registered.
  private readonly dummyHash = hashPassword('dummy-password-for-timing');

  constructor(
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
    private readonly usersService: UsersService,
    private readonly mail: MailService,
    private readonly refreshTokens: RefreshTokensService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
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
      if (isUniqueViolation(error)) {
        throw this.emailAlreadyExists();
      }
      throw error;
    }

    // Queued only once the user exists; never fails the registration.
    await this.mail.send({
      to: user.email,
      template: MailTemplate.Welcome,
      context: { fullName: user.fullName, email: user.email },
    });
    return this.issueToken(user);
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
    return this.issueToken(user);
  }

  // Exchanges a refresh token for a new access token and refresh token of
  // the same session.
  async refresh(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    const rotated = await this.refreshTokens.rotate(dto.refreshToken);
    const user = rotated && (await this.usersService.findById(rotated.userId));
    if (!rotated || !user) {
      throw new AppException({
        code: ErrorCode.InvalidRefreshToken,
        messageKey: 'errors.INVALID_REFRESH_TOKEN',
        status: HttpStatus.UNAUTHORIZED,
      });
    }
    return this.buildResponse(user, rotated);
  }

  // Ends the session: revokes its refresh tokens and blacklists the access
  // token until it would have expired anyway.
  async logout(token: string): Promise<void> {
    const payload = this.jwtService.decode<JwtPayload | null>(token);
    if (payload?.sid) {
      await this.refreshTokens.revokeSession(payload.sid);
    }
    const ttl = (payload?.exp ?? 0) - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.redis.set(blacklistKey(token), '1', ttl);
    }
  }

  // Ends every session of the user, including the one making the request.
  async logoutAll(user: User): Promise<void> {
    await this.refreshTokens.revokeAllForUser(user.id);
    await this.usersService.bumpTokenVersion(user.id);
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

    await this.refreshTokens.revokeAllForUser(user.id);
    user.tokenVersion = tokenVersion;
    return this.issueToken(user);
  }

  // Starts a new session for the user.
  async issueToken(user: User): Promise<AuthResponseDto> {
    return this.buildResponse(
      user,
      await this.refreshTokens.startSession(user.id),
    );
  }

  private async buildResponse(
    user: User,
    refreshToken: IssuedRefreshToken,
  ): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      tv: user.tokenVersion,
      sid: refreshToken.sessionId,
    };
    const accessToken = await this.jwtService.signAsync(payload);
    return {
      accessToken,
      expiresIn: this.config.jwtExpiresInSeconds,
      refreshToken: refreshToken.token,
      refreshExpiresIn: this.config.refreshTokenExpiresInSeconds,
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
