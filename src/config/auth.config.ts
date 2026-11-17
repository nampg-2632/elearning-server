import { registerAs } from '@nestjs/config';

export const authConfig = registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtExpiresInSeconds: Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 86400),
  // OAuth client IDs whose Google ID tokens are accepted (the token's `aud`);
  // comma-separated, e.g. a web and a mobile client. Empty = Google sign-in
  // is off.
  googleClientIds: (process.env.GOOGLE_CLIENT_ID ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
}));
