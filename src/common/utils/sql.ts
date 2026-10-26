// Escapes LIKE/ILIKE wildcards so user input is matched literally
// (Postgres uses backslash as the default escape character).
export const escapeLike = (value: string): string =>
  value.replace(/[\\%_]/g, '\\$&');

// Pattern for "contains", e.g. `name ILIKE :pattern`.
export const containsPattern = (value: string): string =>
  `%${escapeLike(value)}%`;
