import { Column, Entity } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/base.entity';
import { AuthProvider } from '../enums/auth-provider.enum';

// An outside account (e.g. Google) that logs in as a user. Unique per
// (provider, providerUserId) and per (userId, provider).
@Entity('auth_identities')
export class AuthIdentity extends AppBaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: AuthProvider, enumName: 'auth_provider' })
  provider: AuthProvider;

  // The provider's stable user id (Google: the `sub` claim), never the
  // email, which can change or be reassigned.
  @Column({ type: 'varchar', length: 255 })
  providerUserId: string;

  // Email of the outside account when it was linked, for display only.
  @Column({ type: 'varchar', length: 320 })
  email: string;
}
