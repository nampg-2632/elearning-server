import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from '../config/database.config';
import { createTypeOrmOptions } from './typeorm.config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [databaseConfig.KEY],
      useFactory: (config: ConfigType<typeof databaseConfig>) =>
        createTypeOrmOptions({
          applicationName: 'elearning-api',
          databaseUrl: config.url,
          poolMax: config.poolMax,
          logging: config.logging,
        }),
    }),
  ],
})
export class DatabaseModule {}
