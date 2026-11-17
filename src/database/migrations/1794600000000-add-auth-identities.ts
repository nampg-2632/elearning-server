import { MigrationInterface, QueryRunner } from 'typeorm';

// Logins through an outside OAuth/OIDC provider (Google now; Facebook, Apple,
// GitHub... later need only a new auth_provider value). An account found by
// (provider, provider_user_id) logs in, whatever its email is now; a user
// has at most one identity per provider. Passkeys / biometrics store other
// data (public key, counter, one row per device) and get their own table.
// Accounts created through a provider have no password, so password_hash
// becomes nullable.
export class AddAuthIdentities1794600000000 implements MigrationInterface {
  name = 'AddAuthIdentities1794600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE auth_provider AS ENUM ('google')`);
    await queryRunner.query(`
      CREATE TABLE auth_identities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        provider auth_provider NOT NULL,
        provider_user_id VARCHAR(255) NOT NULL,
        email VARCHAR(320) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_auth_identities_provider_user UNIQUE (provider, provider_user_id),
        CONSTRAINT uq_auth_identities_user_provider UNIQUE (user_id, provider)
      )`);
    await queryRunner.query(
      `CREATE TRIGGER trg_auth_identities_updated_at BEFORE UPDATE ON auth_identities FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
    );
    await queryRunner.query(
      `ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`,
    );
  }

  // Fails while an account without a password exists: those accounts can
  // only log in through the identities dropped here, so they must be
  // handled by hand first.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL`,
    );
    await queryRunner.query(`DROP TABLE auth_identities`);
    await queryRunner.query(`DROP TYPE auth_provider`);
  }
}
