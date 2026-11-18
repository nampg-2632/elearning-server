import { registerAs } from '@nestjs/config';
import {
  DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
  DEFAULT_REFRESH_TOKEN_TTL_SECONDS,
} from '../auth/auth.constants';

export const authConfig = registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtExpiresInSeconds: Number(
    process.env.JWT_EXPIRES_IN_SECONDS ?? DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
  ),
  refreshTokenExpiresInSeconds: Number(
    process.env.REFRESH_TOKEN_EXPIRES_IN_SECONDS ??
      DEFAULT_REFRESH_TOKEN_TTL_SECONDS,
  ),
  // OAuth client IDs whose Google ID tokens are accepted (the token's `aud`);
  // comma-separated, e.g. a web and a mobile client. Empty = Google sign-in
  // is off.
  googleClientIds: (process.env.GOOGLE_CLIENT_ID ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
}));
