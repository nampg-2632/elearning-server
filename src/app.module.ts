import { Module } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import { join } from 'node:path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { appConfig } from './config/app.config';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      load: [appConfig],
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
