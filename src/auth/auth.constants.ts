// Requests per minute per client IP on the public auth routes. Counted in
// memory by ThrottlerGuard, so each app instance keeps its own count.
export const LOGIN_LIMIT_PER_MINUTE = 5;
// Register, forgot-password (and login, for unverified accounts) send mail,
// so an open endpoint would let anyone make the server mail any address.
export const REGISTER_LIMIT_PER_MINUTE = 5;
export const FORGOT_PASSWORD_LIMIT_PER_MINUTE = 5;
export const RESET_PASSWORD_LIMIT_PER_MINUTE = 5;
export const VERIFY_EMAIL_LIMIT_PER_MINUTE = 10;

export const VERIFY_EMAIL_TOKEN_TTL_SECONDS = 24 * 60 * 60;
export const RESET_PASSWORD_TOKEN_TTL_SECONDS = 30 * 60;
// At most one verification (or reset) mail per account in this window,
// however many times login (or forgot-password) is called.
export const AUTH_MAIL_COOLDOWN_SECONDS = 2 * 60;

// Pages of the frontend that the mailed links open, with ?token=<token>.
export const VERIFY_EMAIL_PATH = '/verify-email';
export const RESET_PASSWORD_PATH = '/reset-password';
export const FORGOT_PASSWORD_PATH = '/forgot-password';
