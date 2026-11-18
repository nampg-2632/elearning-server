import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { ONE_MINUTE_MS } from '../common/constants/date.constants';
import { Public } from '../common/decorators/public.decorator';
import { SWAGGER_BEARER_AUTH } from '../config/swagger';
import {
  GOOGLE_LOGIN_LIMIT_PER_MINUTE,
  LOGIN_LIMIT_PER_MINUTE,
  REFRESH_LIMIT_PER_MINUTE,
  REGISTER_LIMIT_PER_MINUTE,
} from './auth.constants';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { GoogleIdTokenDto } from './dto/google-id-token.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { extractBearerToken } from './jwt-payload';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleAuthService: GoogleAuthService,
  ) {}

  @Public()
  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: { limit: REGISTER_LIMIT_PER_MINUTE, ttl: ONE_MINUTE_MS },
  })
  @ApiCreatedResponse({ type: AuthResponseDto })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: { limit: LOGIN_LIMIT_PER_MINUTE, ttl: ONE_MINUTE_MS },
  })
  @ApiOkResponse({ type: AuthResponseDto })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: { limit: GOOGLE_LOGIN_LIMIT_PER_MINUTE, ttl: ONE_MINUTE_MS },
  })
  @ApiOperation({
    summary: 'Log in (or sign up) with a Google ID token',
    description:
      'First login creates an account without a password. 409 ACCOUNT_EXISTS_USE_PASSWORD when the email belongs to a password account: log in with the password, then link Google from the profile. 503 GOOGLE_SIGN_IN_DISABLED when GOOGLE_CLIENT_ID is not set.',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  loginWithGoogle(@Body() dto: GoogleIdTokenDto): Promise<AuthResponseDto> {
    return this.googleAuthService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: { limit: REFRESH_LIMIT_PER_MINUTE, ttl: ONE_MINUTE_MS },
  })
  @ApiOperation({
    summary: 'Get a new access token with the refresh token',
    description:
      'Returns a new access token and a new refresh token; the one sent is used up. Sending a used refresh token again signs out that session (it may have leaked). 401 INVALID_REFRESH_TOKEN: unknown, expired, revoked or reused token; log in again.',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth(SWAGGER_BEARER_AUTH)
  @ApiOperation({
    summary: 'Log out of this session',
    description:
      'Revokes the access token and every refresh token of its session.',
  })
  @ApiNoContentResponse()
  async logout(@Req() request: Request): Promise<void> {
    // The global guard already validated this token, so it is present.
    await this.authService.logout(extractBearerToken(request)!);
  }
}
