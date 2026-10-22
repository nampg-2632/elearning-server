import { createHash } from 'node:crypto';
import type { Request } from 'express';
import { ExtractJwt } from 'passport-jwt';
import type { UserRole } from '../common/enums/user-role.enum';

export type JwtPayload = {
  sub: string;
  role: UserRole;
  iat?: number;
  exp?: number;
};

export const extractBearerToken: (request: Request) => string | null =
  ExtractJwt.fromAuthHeaderAsBearerToken();

// Revoked tokens are stored by hash so the raw JWT never sits in Redis.
export const blacklistKey = (token: string): string =>
  `auth:blacklist:${createHash('sha256').update(token).digest('hex')}`;
