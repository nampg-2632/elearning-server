import type { UserRole } from '../common/enums/user-role.enum';
import type { IdentityProvider } from './enums/identity-provider.enum';

export type CreateUserInput = {
  email: string;
  passwordHash: string;
  fullName: string;
  role?: UserRole;
};

export type IdentityInput = {
  provider: IdentityProvider;
  providerUserId: string;
  email: string;
};

// An account that only logs in through `identity`: no password.
export type CreateUserWithIdentityInput = {
  email: string;
  fullName: string;
  avatarUrl: string | null;
  identity: IdentityInput;
};

export type UpdateProfileInput = {
  fullName?: string;
  avatarUrl?: string | null;
};
