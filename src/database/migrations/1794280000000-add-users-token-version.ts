import { MigrationInterface, QueryRunner } from 'typeorm';

// Bumped on password change; JWTs carry it as `tv` and older values are
// rejected, which signs out every existing session.
export class AddUsersTokenVersion1794280000000 implements MigrationInterface {
  name = 'AddUsersTokenVersion1794280000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0 CHECK (token_version >= 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN token_version`);
  }
}
