import { containsPattern, escapeLike } from './sql';

describe('escapeLike', () => {
  it('escapes wildcards and the escape character', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
  });

  it('wraps the escaped value for a contains match', () => {
    expect(containsPattern('a%b')).toBe('%a\\%b%');
  });
});
