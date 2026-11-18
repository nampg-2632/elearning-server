import { createHash, randomBytes } from 'node:crypto';

// Hex SHA-256, e.g. to store or key a secret token without keeping it.
export const sha256Hex = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

// Unguessable token of `bytes` random bytes, URL-safe (base64url).
export const randomToken = (bytes: number): string =>
  randomBytes(bytes).toString('base64url');
