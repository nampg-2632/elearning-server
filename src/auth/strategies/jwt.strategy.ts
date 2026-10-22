import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { authConfig } from '../../config/auth.config';
import { RedisService } from '../../redis/redis.service';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { blacklistKey, extractBearerToken, JwtPayload } from '../jwt-payload';

// Verifies signature/expiry (passport-jwt), then rejects logged-out tokens
// and users that no longer exist. The returned user becomes request.user.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(authConfig.KEY) config: ConfigType<typeof authConfig>,
    private readonly redis: RedisService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: extractBearerToken,
      secretOrKey: config.jwtSecret,
      algorithms: ['HS256'],
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  async validate(request: Request, payload: JwtPayload): Promise<User> {
    const token = extractBearerToken(request);
    if (!token || (await this.redis.exists(blacklistKey(token)))) {
      throw new UnauthorizedException();
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
