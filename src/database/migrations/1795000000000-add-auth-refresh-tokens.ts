import { MigrationInterface, QueryRunner } from 'typeorm';

// Refresh tokens (RFC 9700 §4.14): only the SHA-256 of the opaque token is
// stored. Every login starts a session; each refresh marks the presented
// token used and adds its successor to the same session (the RFC calls these
// tokens a family). A used token presented again means it leaked, so the
// whole session is revoked.
export class AddAuthRefreshTokens1795000000000 implements MigrationInterface {
  name = 'AddAuthRefreshTokens1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE auth_refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        session_id UUID NOT NULL,
        token_hash CHAR(64) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_auth_refresh_tokens_token_hash UNIQUE (token_hash)
      )`);
    await queryRunner.query(
      `CREATE INDEX idx_auth_refresh_tokens_session_id ON auth_refresh_tokens (session_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_auth_refresh_tokens_user_id ON auth_refresh_tokens (user_id)`,
    );
    await queryRunner.query(
      `CREATE TRIGGER trg_auth_refresh_tokens_updated_at BEFORE UPDATE ON auth_refresh_tokens FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE auth_refresh_tokens`);
  }
}
