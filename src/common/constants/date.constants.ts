export const ONE_SECOND_MS = 1000;
export const ONE_MINUTE_MS = 60 * ONE_SECOND_MS;
export const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;
export const ONE_DAY_MS = 24 * ONE_HOUR_MS;

// Durations in seconds, the unit of JWT lifetimes and the *_SECONDS env vars.
export const ONE_MINUTE_SECONDS = 60;
export const ONE_DAY_SECONDS = 24 * 60 * ONE_MINUTE_SECONDS;

// `2026-10-01`, without a time part.
export const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// A bare date, or a date-time with an explicit offset. A date-time without
// one would be read in the server's local time zone.
export const DATE_OR_ZONED_DATE_TIME_REGEX =
  /^\d{4}-\d{2}-\d{2}(T[^Z+-]+(Z|[+-]\d{2}(:?\d{2})?))?$/i;
