import { hash, verify } from 'argon2';

// argon2id with the library defaults. Shared by auth and the seed so both
// produce hashes the login flow can verify.
export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    // Malformed hash: treat as a mismatch rather than a 500.
    return false;
  }
}
