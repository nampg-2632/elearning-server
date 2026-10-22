import { Module } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import { join } from 'node:path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';
import { validateEnv } from './config/env.validation';
import { CoursesModule } from './courses/courses.module';
import { DatabaseModule } from './database/database.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { LessonsModule } from './lessons/lessons.module';
import { ProgressModule } from './progress/progress.module';
import { RedisModule } from './redis/redis.module';
import { TestsModule } from './tests/tests.module';
import { UsersModule } from './users/users.module';
import { WordsModule } from './words/words.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      load: [appConfig, databaseConfig, redisConfig],
      validate: validateEnv,
    }),
    // Language is resolved per request: ?lang=en, then the x-lang header,
    // then Accept-Language; anything else falls back to FALLBACK_LANGUAGE.
    I18nModule.forRootAsync({
      inject: [appConfig.KEY],
      useFactory: (config: ConfigType<typeof appConfig>) => ({
        fallbackLanguage: config.fallbackLanguage,
        fallbacks: { 'vi-*': 'vi', 'en-*': 'en' },
        loaderOptions: {
          path: join(__dirname, 'i18n'),
          watch: config.env === 'development',
        },
      }),
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        new HeaderResolver(['x-lang']),
        AcceptLanguageResolver,
      ],
    }),
    DatabaseModule,
    RedisModule,
    UsersModule,
    CoursesModule,
    LessonsModule,
    WordsModule,
    TestsModule,
    EnrollmentsModule,
    ProgressModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
