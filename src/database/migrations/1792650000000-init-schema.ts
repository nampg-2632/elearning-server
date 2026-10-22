import { MigrationInterface, QueryRunner } from 'typeorm';

const TIMESTAMPS = `
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`;

// Every table gets a BEFORE UPDATE trigger that refreshes updated_at.
const TABLES = [
  'users',
  'courses',
  'lessons',
  'course_lessons',
  'words',
  'lesson_words',
  'tests',
  'questions',
  'question_options',
  'user_courses',
  'user_lessons',
  'test_attempts',
  'attempt_answers',
];

export class InitSchema1792650000000 implements MigrationInterface {
  name = 'InitSchema1792650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql`);

    await queryRunner.query(`CREATE TYPE user_role AS ENUM ('user', 'admin')`);
    await queryRunner.query(
      `CREATE TYPE enrollment_status AS ENUM ('pending', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TYPE lesson_status AS ENUM ('todo', 'doing', 'pass', 'fail')`,
    );
    await queryRunner.query(
      `CREATE TYPE attempt_status AS ENUM ('doing', 'submitted')`,
    );

    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(320) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        avatar_url TEXT,
        role user_role NOT NULL DEFAULT 'user',${TIMESTAMPS}
      )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX uq_users_email_lower ON users (LOWER(email))`,
    );

    await queryRunner.query(`
      CREATE TABLE courses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        thumbnail_url TEXT,
        created_by UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
        deleted_at TIMESTAMPTZ,${TIMESTAMPS}
      )`);
    await queryRunner.query(
      `CREATE INDEX idx_courses_name_lower ON courses (LOWER(name))`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_courses_created_at ON courses (created_at) WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_courses_created_by ON courses (created_by)`,
    );

    await queryRunner.query(`
      CREATE TABLE lessons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,${TIMESTAMPS}
      )`);

    await queryRunner.query(`
      CREATE TABLE course_lessons (
        course_id UUID NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
        lesson_id UUID NOT NULL REFERENCES lessons (id) ON DELETE CASCADE,
        position INT NOT NULL CHECK (position > 0),${TIMESTAMPS},
        PRIMARY KEY (course_id, lesson_id),
        CONSTRAINT uq_course_lessons_position UNIQUE (course_id, position)
      )`);
    await queryRunner.query(
      `CREATE INDEX idx_course_lessons_lesson_id ON course_lessons (lesson_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE words (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content VARCHAR(255) NOT NULL,
        meaning TEXT NOT NULL,${TIMESTAMPS}
      )`);
    await queryRunner.query(
      `CREATE INDEX idx_words_content_lower ON words (LOWER(content))`,
    );

    await queryRunner.query(`
      CREATE TABLE lesson_words (
        lesson_id UUID NOT NULL REFERENCES lessons (id) ON DELETE CASCADE,
        word_id UUID NOT NULL REFERENCES words (id) ON DELETE CASCADE,
        position INT NOT NULL CHECK (position > 0),${TIMESTAMPS},
        PRIMARY KEY (lesson_id, word_id),
        CONSTRAINT uq_lesson_words_position UNIQUE (lesson_id, position)
      )`);
    await queryRunner.query(
      `CREATE INDEX idx_lesson_words_word_id ON lesson_words (word_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE tests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lesson_id UUID NOT NULL UNIQUE REFERENCES lessons (id) ON DELETE CASCADE,
        pass_score INT NOT NULL DEFAULT 80 CHECK (pass_score BETWEEN 0 AND 100),${TIMESTAMPS}
      )`);

    await queryRunner.query(`
      CREATE TABLE questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        test_id UUID NOT NULL REFERENCES tests (id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        position INT NOT NULL CHECK (position > 0),${TIMESTAMPS},
        CONSTRAINT uq_questions_position UNIQUE (test_id, position)
      )`);

    await queryRunner.query(`
      CREATE TABLE question_options (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        question_id UUID NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_correct BOOLEAN NOT NULL DEFAULT false,
        position INT NOT NULL CHECK (position > 0),${TIMESTAMPS},
        CONSTRAINT uq_question_options_position UNIQUE (question_id, position)
      )`);
    // Single choice: at most one correct option per question.
    await queryRunner.query(
      `CREATE UNIQUE INDEX uq_question_options_correct ON question_options (question_id) WHERE is_correct`,
    );

    await queryRunner.query(`
      CREATE TABLE user_courses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        course_id UUID NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
        status enrollment_status NOT NULL DEFAULT 'pending',
        reviewed_by UUID REFERENCES users (id) ON DELETE SET NULL,
        reviewed_at TIMESTAMPTZ,
        reject_reason TEXT,${TIMESTAMPS},
        CONSTRAINT uq_user_courses_user_course UNIQUE (user_id, course_id)
      )`);
    await queryRunner.query(
      `CREATE INDEX idx_user_courses_course_status ON user_courses (course_id, status)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_user_courses_status_created_at ON user_courses (status, created_at)`,
    );

    await queryRunner.query(`
      CREATE TABLE user_lessons (
        user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        lesson_id UUID NOT NULL REFERENCES lessons (id) ON DELETE CASCADE,
        status lesson_status NOT NULL DEFAULT 'todo',
        best_score INT CHECK (best_score BETWEEN 0 AND 100),
        passed_at TIMESTAMPTZ,${TIMESTAMPS},
        PRIMARY KEY (user_id, lesson_id)
      )`);
    await queryRunner.query(
      `CREATE INDEX idx_user_lessons_lesson_id ON user_lessons (lesson_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE test_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        test_id UUID NOT NULL REFERENCES tests (id) ON DELETE CASCADE,
        status attempt_status NOT NULL DEFAULT 'doing',
        score INT CHECK (score BETWEEN 0 AND 100),
        correct_count INT CHECK (correct_count >= 0),
        total_questions INT NOT NULL CHECK (total_questions >= 0),
        passed BOOLEAN,
        started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        submitted_at TIMESTAMPTZ,${TIMESTAMPS},
        CONSTRAINT ck_test_attempts_result CHECK (
          (status = 'doing' AND submitted_at IS NULL AND score IS NULL
            AND correct_count IS NULL AND passed IS NULL)
          OR (status = 'submitted' AND submitted_at IS NOT NULL AND score IS NOT NULL
            AND correct_count IS NOT NULL AND passed IS NOT NULL)
        )
      )`);
    // At most one in-progress attempt per user and test.
    await queryRunner.query(
      `CREATE UNIQUE INDEX uq_test_attempts_doing ON test_attempts (user_id, test_id) WHERE status = 'doing'`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_test_attempts_user_test_started ON test_attempts (user_id, test_id, started_at DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_test_attempts_test_id ON test_attempts (test_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE attempt_answers (
        attempt_id UUID NOT NULL REFERENCES test_attempts (id) ON DELETE CASCADE,
        question_id UUID NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
        selected_option_id UUID REFERENCES question_options (id),
        is_correct BOOLEAN NOT NULL,${TIMESTAMPS},
        PRIMARY KEY (attempt_id, question_id)
      )`);
    await queryRunner.query(
      `CREATE INDEX idx_attempt_answers_question_id ON attempt_answers (question_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_attempt_answers_selected_option_id ON attempt_answers (selected_option_id)`,
    );

    for (const table of TABLES) {
      await queryRunner.query(
        `CREATE TRIGGER trg_${table}_updated_at BEFORE UPDATE ON ${table} FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Dropping the tables also drops their triggers and indexes.
    for (const table of [...TABLES].reverse()) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${table}`);
    }
    await queryRunner.query(`DROP TYPE IF EXISTS attempt_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS lesson_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS enrollment_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS user_role`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS set_updated_at()`);
  }
}
