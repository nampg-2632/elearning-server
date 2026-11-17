import { QueryFailedError } from 'typeorm';
import { PG_UNIQUE_VIOLATION } from '../constants/database.constants';

// Escapes LIKE/ILIKE wildcards so user input is matched literally
// (Postgres uses backslash as the default escape character).
export const escapeLike = (value: string): string =>
  value.replace(/[\\%_]/g, '\\$&');

// Pattern for "contains", e.g. `name ILIKE :pattern`.
export const containsPattern = (value: string): string =>
  `%${escapeLike(value)}%`;

// A Postgres unique violation, e.g. a concurrent insert that won the race.
export const isUniqueViolation = (error: unknown): boolean =>
  error instanceof QueryFailedError &&
  (error.driverError as { code?: string }).code === PG_UNIQUE_VIOLATION;
