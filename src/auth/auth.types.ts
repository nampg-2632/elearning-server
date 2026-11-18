// What the app keeps from a verified Google ID token.
export type GoogleProfile = {
  // Stable Google account id; what the account is matched on.
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
};

// A refresh token handed to the client and the session it belongs to.
export type IssuedRefreshToken = {
  token: string;
  sessionId: string;
};

// The successor of a refresh token and the user it belongs to.
export type RotatedRefreshToken = IssuedRefreshToken & {
  userId: string;
};

// Row returned by the rotation UPDATE ... RETURNING.
export type UsedRefreshTokenRow = {
  user_id: string;
  session_id: string;
};
