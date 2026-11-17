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
import { UserResponseDto } from '../users/dto/user-response.dto';
import {
  FORGOT_PASSWORD_LIMIT_PER_MINUTE,
  LOGIN_LIMIT_PER_MINUTE,
  REGISTER_LIMIT_PER_MINUTE,
  RESET_PASSWORD_LIMIT_PER_MINUTE,
  VERIFY_EMAIL_LIMIT_PER_MINUTE,
} from './auth.constants';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto, VerifyEmailDto } from './dto/token.dto';
import { extractBearerToken } from './jwt-payload';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: { limit: REGISTER_LIMIT_PER_MINUTE, ttl: ONE_MINUTE_MS },
  })
  @ApiOperation({
    summary: 'Create an account and mail a verification link',
    description:
      'Returns no token: login is refused with EMAIL_NOT_VERIFIED until the link is opened.',
  })
  @ApiCreatedResponse({ type: UserResponseDto })
  register(@Body() dto: RegisterDto): Promise<UserResponseDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: { limit: LOGIN_LIMIT_PER_MINUTE, ttl: ONE_MINUTE_MS },
  })
  @ApiOperation({
    description:
      'Right password but unverified email: 403 EMAIL_NOT_VERIFIED, and a new verification link is mailed (at most once every 2 minutes).',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: { limit: VERIFY_EMAIL_LIMIT_PER_MINUTE, ttl: ONE_MINUTE_MS },
  })
  @ApiOperation({ summary: 'Verify the email with the mailed token' })
  @ApiNoContentResponse()
  verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> {
    return this.authService.verifyEmail(dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: { limit: FORGOT_PASSWORD_LIMIT_PER_MINUTE, ttl: ONE_MINUTE_MS },
  })
  @ApiOperation({
    summary: 'Mail a password reset link',
    description:
      '404 EMAIL_NOT_FOUND for an unknown email. One mail per account every 2 minutes; a request within that window returns 204 without a new mail.',
  })
  @ApiNoContentResponse()
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: { limit: RESET_PASSWORD_LIMIT_PER_MINUTE, ttl: ONE_MINUTE_MS },
  })
  @ApiOperation({
    summary: 'Set a new password with the mailed token',
    description:
      'Signs out every session and marks the email verified. Returns no token: log in with the new password.',
  })
  @ApiNoContentResponse()
  resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    return this.authService.resetPassword(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth(SWAGGER_BEARER_AUTH)
  @ApiNoContentResponse()
  async logout(@Req() request: Request): Promise<void> {
    // The global guard already validated this token, so it is present.
    await this.authService.logout(extractBearerToken(request)!);
  }
}
