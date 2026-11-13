import { describeError } from './describe-error';

describe('describeError', () => {
  it('prefers the message, then the code, then the name', () => {
    expect(describeError(new Error('boom'))).toBe('boom');
    expect(
      describeError(
        Object.assign(new AggregateError([]), { code: 'ECONNREFUSED' }),
      ),
    ).toBe('ECONNREFUSED');
    expect(describeError(new AggregateError([]))).toBe('AggregateError');
    expect(describeError('plain')).toBe('plain');
  });
});
