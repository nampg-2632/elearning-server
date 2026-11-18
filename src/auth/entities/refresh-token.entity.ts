import { Column, Entity } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/base.entity';

// One issued refresh token. Tokens of one login share a sessionId (`sid`
// in the access token).
@Entity('auth_refresh_tokens')
export class RefreshToken extends AppBaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  sessionId: string;

  // SHA-256 hex of the token; the raw token is never stored.
  @Column({ type: 'char', length: 64 })
  tokenHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  // Set when the token was exchanged for its successor.
  @Column({ type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;
}
