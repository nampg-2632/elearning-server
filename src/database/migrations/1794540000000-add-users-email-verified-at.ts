import { MigrationInterface, QueryRunner } from 'typeorm';

// Set when the user opens the link in the verification mail (or resets the
// password through a mailed link); login is refused while it is null.
// Accounts that already exist were created before verification and keep
// working: they count as verified from their creation.
export class AddUsersEmailVerifiedAt1794540000000 implements MigrationInterface {
  name = 'AddUsersEmailVerifiedAt1794540000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ`,
    );
    await queryRunner.query(`UPDATE users SET email_verified_at = created_at`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN email_verified_at`);
  }
}
