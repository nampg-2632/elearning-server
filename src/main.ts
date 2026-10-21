import { Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { I18nValidationExceptionFilter, I18nValidationPipe } from 'nestjs-i18n';
import { AppModule } from './app.module';
import { appConfig } from './config/app.config';
import { setupSwagger, SWAGGER_PATH } from './config/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

  app.setGlobalPrefix(config.apiPrefix);
  app.use(helmet());
  app.enableCors({
    origin: config.corsOrigins.length > 0 ? config.corsOrigins : false,
    credentials: true,
  });
  // Validates every DTO; messages declared with i18nValidationMessage() are
  // translated into the request language by the filter below.
  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(
    new I18nValidationExceptionFilter({ detailedErrors: false }),
  );
  app.enableShutdownHooks();

  if (config.env !== 'production') {
    setupSwagger(app, config.name);
  }

  await app.listen(config.port);
  Logger.log(
    `API ready at ${config.url}/${config.apiPrefix} (docs: ${config.url}/${SWAGGER_PATH})`,
    'Bootstrap',
  );
}
void bootstrap();
