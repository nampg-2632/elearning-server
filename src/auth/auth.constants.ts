import {
  ONE_DAY_SECONDS,
  ONE_MINUTE_SECONDS,
} from '../common/constants/date.constants';

// Requests per minute per client IP on the public auth routes. Counted in
// memory by ThrottlerGuard, so each app instance keeps its own count.
export const LOGIN_LIMIT_PER_MINUTE = 5;
// Each register sends a welcome mail, so an open endpoint would let anyone
// make the server mail arbitrary addresses.
export const REGISTER_LIMIT_PER_MINUTE = 5;
// Each call checks a token against Google's keys and may create a user.
export const GOOGLE_LOGIN_LIMIT_PER_MINUTE = 10;
// Guessing the current password with a stolen token is limited like login.
export const CHANGE_PASSWORD_LIMIT_PER_MINUTE = 5;

// The `iss` values Google puts in its ID tokens.
export const GOOGLE_ISSUERS = [
  'accounts.google.com',
  'https://accounts.google.com',
];
// Google ID tokens are around 1 KB; the bound only stops huge input.
export const GOOGLE_ID_TOKEN_MAX_LENGTH = 4096;

// Refreshing is cheap but public; the bound only stops abuse. A client
// refreshes about once per access token lifetime.
export const REFRESH_LIMIT_PER_MINUTE = 30;
// 256 bits of randomness; 43 characters in base64url.
export const REFRESH_TOKEN_BYTES = 32;
// Upper bound for the DTO; a real token is 43 characters.
export const REFRESH_TOKEN_MAX_LENGTH = 128;

// Defaults of JWT_EXPIRES_IN_SECONDS and REFRESH_TOKEN_EXPIRES_IN_SECONDS.
export const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 15 * ONE_MINUTE_SECONDS;
export const DEFAULT_REFRESH_TOKEN_TTL_SECONDS = 30 * ONE_DAY_SECONDS;
