import { MigrationInterface, QueryRunner } from 'typeorm';

// Logins through an outside provider (Google for now). An account found by
// (provider, provider_user_id) logs in, whatever its email is now; a user
// has at most one identity per provider. Accounts created through Google
// have no password, so password_hash becomes nullable.
export class AddUserIdentities1794600000000 implements MigrationInterface {
  name = 'AddUserIdentities1794600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE identity_provider AS ENUM ('google')`);
    await queryRunner.query(`
      CREATE TABLE user_identities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        provider identity_provider NOT NULL,
        provider_user_id VARCHAR(255) NOT NULL,
        email VARCHAR(320) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_user_identities_provider_user UNIQUE (provider, provider_user_id),
        CONSTRAINT uq_user_identities_user_provider UNIQUE (user_id, provider)
      )`);
    await queryRunner.query(
      `CREATE TRIGGER trg_user_identities_updated_at BEFORE UPDATE ON user_identities FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
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
    await queryRunner.query(`DROP TABLE user_identities`);
    await queryRunner.query(`DROP TYPE identity_provider`);
  }
}
