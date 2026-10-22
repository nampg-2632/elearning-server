import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { QueryFailedError } from 'typeorm';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/exceptions/error-code.enum';
import { hashPassword, verifyPassword } from '../common/utils/password';
import { authConfig } from '../config/auth.config';
import { RedisService } from '../redis/redis.service';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { blacklistKey, JwtPayload } from './jwt-payload';

const PG_UNIQUE_VIOLATION = '23505';

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
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === PG_UNIQUE_VIOLATION
      ) {
        throw this.emailAlreadyExists();
      }
      throw error;
    }

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

  // Blacklists the token until it would have expired anyway.
  async logout(token: string): Promise<void> {
    const payload = this.jwtService.decode<JwtPayload | null>(token);
    const ttl = (payload?.exp ?? 0) - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.redis.set(blacklistKey(token), '1', ttl);
    }
  }

  private async issueToken(user: User): Promise<AuthResponseDto> {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);
    return {
      accessToken,
      expiresIn: this.config.jwtExpiresInSeconds,
      user: UserResponseDto.fromEntity(user),
    };
  }

  private emailAlreadyExists(): AppException {
    return new AppException({
      code: ErrorCode.EmailAlreadyExists,
      messageKey: 'errors.EMAIL_ALREADY_EXISTS',
      status: HttpStatus.CONFLICT,
    });
  }
}
