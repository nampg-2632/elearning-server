import { withTimeout } from './with-timeout';

describe('withTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves with the value when the promise answers in time', async () => {
    await expect(withTimeout(Promise.resolve('PONG'), 100)).resolves.toBe(
      'PONG',
    );
    expect(jest.getTimerCount()).toBe(0);
  });

  it('rejects with the original error when the promise fails in time', async () => {
    const error = new Error('connection refused');

    await expect(withTimeout(Promise.reject(error), 100)).rejects.toBe(error);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('rejects when the promise does not answer in time', async () => {
    const result = withTimeout(new Promise(() => {}), 100);
    const assertion = expect(result).rejects.toThrow('timed out after 100ms');

    await jest.advanceTimersByTimeAsync(100);
    await assertion;
  });
});
