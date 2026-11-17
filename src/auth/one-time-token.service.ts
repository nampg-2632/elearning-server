import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { RedisService } from '../redis/redis.service';

export enum OneTimeTokenPurpose {
  VerifyEmail = 'verify-email',
  ResetPassword = 'reset-password',
}

export type OneTimeTokenData = {
  userId: string;
  // users.token_version when issued. A reset link is refused once it has
  // changed, so changing the password kills every older link.
  tokenVersion: number;
};

const TOKEN_BYTES = 32;

const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

const tokenKey = (purpose: OneTimeTokenPurpose, token: string): string =>
  `auth:${purpose}:token:${hashToken(token)}`;

const cooldownKey = (purpose: OneTimeTokenPurpose, userId: string): string =>
  `auth:${purpose}:cooldown:${userId}`;

// Random tokens mailed as links (verify email, reset password). Redis keeps
// only their SHA-256, so a leaked Redis dump holds no usable link; each
// token works once and expires on its own.
@Injectable()
export class OneTimeTokenService {
  constructor(private readonly redis: RedisService) {}

  async issue(
    purpose: OneTimeTokenPurpose,
    data: OneTimeTokenData,
    ttlSeconds: number,
  ): Promise<string> {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    await this.redis.setJson(tokenKey(purpose, token), data, ttlSeconds);
    return token;
  }

  // Deletes the token while reading it: a second use finds nothing.
  async consume(
    purpose: OneTimeTokenPurpose,
    token: string,
  ): Promise<OneTimeTokenData | null> {
    const value = await this.redis.getDel(tokenKey(purpose, token));
    return value === null ? null : (JSON.parse(value) as OneTimeTokenData);
  }

  // true at most once per window for a user, so callers mail only then.
  startCooldown(
    purpose: OneTimeTokenPurpose,
    userId: string,
    seconds: number,
  ): Promise<boolean> {
    return this.redis.setIfAbsent(cooldownKey(purpose, userId), '1', seconds);
  }
}
