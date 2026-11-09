// Settles like `promise`, or rejects once `ms` pass without an answer. The
// original promise keeps running; only the wait is cut short.
export const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out after ${ms}ms`)),
      ms,
    );
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
