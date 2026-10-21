import 'dotenv/config';
import { DataSource } from 'typeorm';
import { createTypeOrmOptions } from './typeorm.config';

// Used only by the TypeORM CLI (yarn db:migrate ...).
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run database migrations');
}

export default new DataSource(
  createTypeOrmOptions({
    applicationName: 'elearning-migrator',
    databaseUrl,
    poolMax: Number(process.env.DATABASE_POOL_MAX ?? 10),
    logging: process.env.DATABASE_LOGGING === 'true',
  }),
);
