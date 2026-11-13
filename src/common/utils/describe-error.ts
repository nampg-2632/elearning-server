// ECONNREFUSED on dual-stack hosts arrives as an AggregateError with an
// empty message, so fall back to the error code/name.
export const describeError = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const { code } = error as Error & { code?: string };
  return error.message || code || error.name;
};
