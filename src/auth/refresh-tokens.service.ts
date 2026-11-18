import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { ONE_SECOND_MS } from '../common/constants/date.constants';
import { randomToken, sha256Hex } from '../common/utils/crypto';
import { authConfig } from '../config/auth.config';
import { REFRESH_TOKEN_BYTES } from './auth.constants';
import type {
  IssuedRefreshToken,
  RotatedRefreshToken,
  UsedRefreshTokenRow,
} from './auth.types';
import { RefreshToken } from './entities/refresh-token.entity';

// Opaque refresh tokens with rotation and reuse detection (RFC 9700 §4.14).
// A token is good for one exchange; presenting it again revokes its session,
// signing out both the thief and the victim of a leaked token.
@Injectable()
export class RefreshTokensService {
  constructor(
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
    @InjectRepository(RefreshToken)
    private readonly tokens: Repository<RefreshToken>,
  ) {}

  // Starts a new session for the user and returns its first token.
  async startSession(userId: string): Promise<IssuedRefreshToken> {
    // Rows past their expiry are useless, also for reuse detection; drop
    // the user's while we are here so the table does not grow forever.
    await this.tokens
      .createQueryBuilder()
      .delete()
      .where('user_id = :userId AND expires_at <= now()', { userId })
      .execute();
    const sessionId = randomUUID();
    const token = await this.insert(this.tokens, userId, sessionId);
    return { token, sessionId };
  }

  // Exchanges a token for its successor in the same session. null when the
  // token is unknown, expired, revoked or already used (then the session is
  // revoked too).
  rotate(token: string): Promise<RotatedRefreshToken | null> {
    const tokenHash = sha256Hex(token);
    return this.tokens.manager.transaction(async (manager) => {
      const repository = manager.getRepository(RefreshToken);
      // Conditional update, so of two concurrent exchanges only one wins.
      const result = await repository
        .createQueryBuilder()
        .update()
        .set({ usedAt: () => 'now()' })
        .where(
          'token_hash = :tokenHash AND used_at IS NULL AND revoked_at IS NULL AND expires_at > now()',
          { tokenHash },
        )
        .returning('user_id, session_id')
        .execute();
      const rows = result.raw as UsedRefreshTokenRow[];

      if (rows.length === 0) {
        const stored = await repository.findOneBy({ tokenHash });
        if (stored?.usedAt && !stored.revokedAt) {
          await this.revokeWhere(repository, 'session_id = :id', {
            id: stored.sessionId,
          });
        }
        return null;
      }

      const { user_id: userId, session_id: sessionId } = rows[0];
      const next = await this.insert(repository, userId, sessionId);
      return { token: next, sessionId, userId };
    });
  }

  // Logout of one session.
  async revokeSession(sessionId: string): Promise<void> {
    await this.revokeWhere(this.tokens, 'session_id = :id', { id: sessionId });
  }

  // Logout of every session, e.g. after a password change.
  async revokeAllForUser(userId: string): Promise<void> {
    await this.revokeWhere(this.tokens, 'user_id = :id', { id: userId });
  }

  private async revokeWhere(
    repository: Repository<RefreshToken>,
    condition: string,
    parameters: { id: string },
  ): Promise<void> {
    await repository
      .createQueryBuilder()
      .update()
      .set({ revokedAt: () => 'now()' })
      .where(`${condition} AND revoked_at IS NULL`, parameters)
      .execute();
  }

  private async insert(
    repository: Repository<RefreshToken>,
    userId: string,
    sessionId: string,
  ): Promise<string> {
    const token = randomToken(REFRESH_TOKEN_BYTES);
    await repository.insert({
      userId,
      sessionId,
      tokenHash: sha256Hex(token),
      expiresAt: new Date(
        Date.now() + this.config.refreshTokenExpiresInSeconds * ONE_SECOND_MS,
      ),
    });
    return token;
  }
}
