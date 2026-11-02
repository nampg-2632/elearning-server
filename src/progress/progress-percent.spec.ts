import { progressPercent } from './progress-percent';

describe('progressPercent', () => {
  it('rounds to 2 decimals', () => {
    expect(progressPercent(5, 12)).toBe(41.67);
    expect(progressPercent(1, 3)).toBe(33.33);
  });

  it('returns 100 when every lesson is passed', () => {
    expect(progressPercent(3, 3)).toBe(100);
  });

  it('returns 0 for a course without lessons', () => {
    expect(progressPercent(0, 0)).toBe(0);
  });
});
