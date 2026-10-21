import { join } from 'node:path';
import { DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from './snake-naming.strategy';

type TypeOrmOptionsInput = {
  applicationName: string;
  databaseUrl: string;
  poolMax: number;
  logging?: boolean;
};

// Shared by the Nest app and the TypeORM CLI. Entities are discovered by
// glob; schema changes go through migrations only (synchronize is off).
export function createTypeOrmOptions({
  applicationName,
  databaseUrl,
  poolMax,
  logging = false,
}: TypeOrmOptionsInput): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],
    migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
    migrationsTableName: 'typeorm_migrations',
    migrationsRun: false,
    synchronize: false,
    logging,
    namingStrategy: new SnakeNamingStrategy(),
    uuidExtension: 'pgcrypto',
    extra: {
      application_name: applicationName,
      max: poolMax,
    },
  };
}
