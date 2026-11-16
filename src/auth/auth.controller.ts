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
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { ONE_MINUTE_MS } from '../common/constants/date.constants';
import { Public } from '../common/decorators/public.decorator';
import { SWAGGER_BEARER_AUTH } from '../config/swagger';
import {
  LOGIN_LIMIT_PER_MINUTE,
  REGISTER_LIMIT_PER_MINUTE,
} from './auth.constants';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
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

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth(SWAGGER_BEARER_AUTH)
  @ApiNoContentResponse()
  async logout(@Req() request: Request): Promise<void> {
    // The global guard already validated this token, so it is present.
    await this.authService.logout(extractBearerToken(request)!);
  }
}
