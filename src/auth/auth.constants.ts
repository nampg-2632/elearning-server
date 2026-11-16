// Requests per minute per client IP on the public auth routes. Counted in
// memory by ThrottlerGuard, so each app instance keeps its own count.
export const LOGIN_LIMIT_PER_MINUTE = 5;
// Each register sends a welcome mail, so an open endpoint would let anyone
// make the server mail arbitrary addresses.
export const REGISTER_LIMIT_PER_MINUTE = 5;
