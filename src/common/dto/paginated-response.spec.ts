import { paginate } from './paginated-response';

describe('paginate', () => {
  it('builds meta with the rounded-up page count', () => {
    expect(paginate(['a', 'b'], 41, { page: 3, limit: 20 })).toEqual({
      items: ['a', 'b'],
      meta: { page: 3, limit: 20, total: 41, totalPages: 3 },
    });
  });

  it('returns zero pages for an empty result', () => {
    expect(paginate([], 0, { page: 1, limit: 20 }).meta.totalPages).toBe(0);
  });
});
