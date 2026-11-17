import { OAuth2Client } from 'google-auth-library';
import { GoogleIdTokenVerifier } from './google-id-token.verifier';

const CLIENT_IDS = ['web.apps.googleusercontent.com'];

describe('GoogleIdTokenVerifier', () => {
  let fetchCerts: jest.SpyInstance;
  let verifyIdToken: jest.SpyInstance;
  const verifier = new GoogleIdTokenVerifier({
    jwtSecret: 'x',
    jwtExpiresInSeconds: 60,
    googleClientIds: CLIENT_IDS,
  });

  const ticket = (payload: object | undefined) => ({
    getPayload: () => payload,
  });

  const certs = { kid1: 'pem' };

  beforeEach(() => {
    fetchCerts = jest
      .spyOn(OAuth2Client.prototype, 'getFederatedSignonCertsAsync')
      .mockResolvedValue({ certs } as never);
    verifyIdToken = jest.spyOn(
      OAuth2Client.prototype,
      'verifySignedJwtWithCertsAsync',
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('checks the token against our client IDs and maps the payload', async () => {
    verifyIdToken.mockResolvedValue(
      ticket({
        sub: '123',
        email: 'Nam@Gmail.com',
        email_verified: true,
        name: '  Nam  ',
        picture: 'https://example.com/p.png',
      }),
    );

    await expect(verifier.verify('id-token')).resolves.toEqual({
      sub: '123',
      email: 'nam@gmail.com',
      emailVerified: true,
      name: 'Nam',
      picture: 'https://example.com/p.png',
    });
    expect(verifyIdToken).toHaveBeenCalledWith('id-token', certs, CLIENT_IDS, [
      'accounts.google.com',
      'https://accounts.google.com',
    ]);
  });

  it('treats a missing email_verified as not verified', async () => {
    verifyIdToken.mockResolvedValue(ticket({ sub: '123', email: 'a@b.c' }));

    await expect(verifier.verify('id-token')).resolves.toMatchObject({
      emailVerified: false,
      name: null,
      picture: null,
    });
  });

  it('returns null for a token the library rejects', async () => {
    verifyIdToken.mockRejectedValue(new Error('Wrong recipient'));

    await expect(verifier.verify('id-token')).resolves.toBeNull();
  });

  it('returns null for a payload without sub or email', async () => {
    verifyIdToken.mockResolvedValue(ticket({ sub: '123' }));

    await expect(verifier.verify('id-token')).resolves.toBeNull();
  });

  it("throws when Google's keys cannot be fetched", async () => {
    const error = new Error('Failed to retrieve verification certificates');
    fetchCerts.mockRejectedValue(error);

    await expect(verifier.verify('id-token')).rejects.toBe(error);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('is disabled without a client ID', () => {
    expect(
      new GoogleIdTokenVerifier({
        jwtSecret: 'x',
        jwtExpiresInSeconds: 60,
        googleClientIds: [],
      }).enabled,
    ).toBe(false);
  });
});
