import { Column, Entity } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/base.entity';
import { IdentityProvider } from '../enums/identity-provider.enum';

// An outside account (e.g. Google) that logs in as a user. Unique per
// (provider, providerUserId) and per (userId, provider).
@Entity('user_identities')
export class UserIdentity extends AppBaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: IdentityProvider,
    enumName: 'identity_provider',
  })
  provider: IdentityProvider;

  // The provider's stable user id (Google: the `sub` claim), never the
  // email, which can change or be reassigned.
  @Column({ type: 'varchar', length: 255 })
  providerUserId: string;

  // Email of the outside account when it was linked, for display only.
  @Column({ type: 'varchar', length: 320 })
  email: string;
}
