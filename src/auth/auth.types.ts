// What the app keeps from a verified Google ID token.
export type GoogleProfile = {
  // Stable Google account id; what the account is matched on.
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
};
