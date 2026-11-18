import type { Request } from 'express';
import { ExtractJwt } from 'passport-jwt';
import type { UserRole } from '../common/enums/user-role.enum';
import { sha256Hex } from '../common/utils/crypto';

export type JwtPayload = {
  sub: string;
  role: UserRole;
  // users.token_version at signing time. Missing in tokens issued before
  // the column existed, which counts as 0.
  tv?: number;
  // Session id: the session (auth_refresh_tokens.session_id) this token was
  // issued with.
  // Missing in tokens issued before refresh tokens existed.
  sid?: string;
  iat?: number;
  exp?: number;
};

export const extractBearerToken: (request: Request) => string | null =
  ExtractJwt.fromAuthHeaderAsBearerToken();

// Revoked tokens are stored by hash so the raw JWT never sits in Redis.
export const blacklistKey = (token: string): string =>
  `auth:blacklist:${sha256Hex(token)}`;
