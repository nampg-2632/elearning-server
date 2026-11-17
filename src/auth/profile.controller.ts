import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SWAGGER_BEARER_AUTH } from '../config/swagger';
import { UpdateProfileDto } from '../users/dto/update-profile.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { CHANGE_PASSWORD_LIMIT_PER_MINUTE } from './auth.constants';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GoogleIdTokenDto } from './dto/google-id-token.dto';
import { GoogleAuthService } from './google-auth.service';

@ApiTags('Profile')
@ApiBearerAuth(SWAGGER_BEARER_AUTH)
@Controller('me')
export class ProfileController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @ApiOkResponse({ type: UserResponseDto })
  get(@CurrentUser() user: User): UserResponseDto {
    return UserResponseDto.fromEntity(user);
  }

  @Patch()
  @ApiOkResponse({ type: UserResponseDto })
  async update(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return UserResponseDto.fromEntity(
      await this.usersService.updateProfile(user, dto),
    );
  }

  // Signs out every other session and returns a new token for this one.
  @Patch('password')
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: { limit: CHANGE_PASSWORD_LIMIT_PER_MINUTE, ttl: 60_000 },
  })
  @ApiOkResponse({ type: AuthResponseDto })
  changePassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
  ): Promise<AuthResponseDto> {
    return this.authService.changePassword(user, dto);
  }

  @Post('identities/google')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Link a Google account to this account',
    description:
      'Afterwards POST /auth/google with that Google account logs in here. 409 GOOGLE_ACCOUNT_ALREADY_LINKED (linked to another account) or GOOGLE_ALREADY_LINKED (this account has another Google account).',
  })
  @ApiNoContentResponse()
  linkGoogle(
    @CurrentUser() user: User,
    @Body() dto: GoogleIdTokenDto,
  ): Promise<void> {
    return this.googleAuthService.link(user, dto);
  }
}
