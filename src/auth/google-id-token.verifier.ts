import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { describeError } from '../common/utils/describe-error';
import { authConfig } from '../config/auth.config';
import { GOOGLE_ISSUERS } from './auth.constants';
import type { GoogleProfile } from './auth.types';

// Checks a Google ID token (the `credential` that Sign in with Google gives
// the frontend): Google's signature, issuer, expiry, and that it was issued
// to one of our client IDs. Google's public keys are fetched over HTTPS and
// cached by the library.
@Injectable()
export class GoogleIdTokenVerifier {
  private readonly logger = new Logger(GoogleIdTokenVerifier.name);
  private readonly client = new OAuth2Client();

  constructor(
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
  ) {}

  get enabled(): boolean {
    return this.config.googleClientIds.length > 0;
  }

  // null for any token that is not a valid ID token for our clients.
  // Throws when Google's keys cannot be fetched, so an outage is a server
  // error and not a "please sign in again".
  async verify(idToken: string): Promise<GoogleProfile | null> {
    // Same two steps as OAuth2Client.verifyIdToken(), which would report
    // both failures alike.
    const { certs } = await this.client.getFederatedSignonCertsAsync();
    let payload;
    try {
      const ticket = await this.client.verifySignedJwtWithCertsAsync(
        idToken,
        certs,
        this.config.googleClientIds,
        GOOGLE_ISSUERS,
      );
      payload = ticket.getPayload();
    } catch (error) {
      this.logger.debug(`Rejected Google ID token: ${describeError(error)}`);
      return null;
    }
    if (!payload?.sub || !payload.email) {
      return null;
    }
    return {
      sub: payload.sub,
      email: payload.email.toLowerCase(),
      emailVerified: payload.email_verified === true,
      name: payload.name?.trim() || null,
      picture: payload.picture ?? null,
    };
  }
}
