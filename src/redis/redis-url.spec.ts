import { parseRedisUrl } from './redis-url';

describe('parseRedisUrl', () => {
  it('reads host and port, defaulting the port', () => {
    expect(parseRedisUrl('redis://redis:6380')).toMatchObject({
      host: 'redis',
      port: 6380,
      tls: undefined,
    });
    expect(parseRedisUrl('redis://localhost').port).toBe(6379);
  });

  it('reads credentials, db and TLS', () => {
    expect(parseRedisUrl('rediss://app:p%40ss@cache.local:6379/2')).toEqual({
      host: 'cache.local',
      port: 6379,
      username: 'app',
      password: 'p@ss',
      db: 2,
      tls: {},
    });
  });
});
