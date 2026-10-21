import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_PATH = 'docs';
export const SWAGGER_BEARER_AUTH = 'bearer';

export function setupSwagger(app: INestApplication, appName: string): void {
  const config = new DocumentBuilder()
    .setTitle(`${appName} API`)
    .setDescription('API documentation for the e-Learning system')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      SWAGGER_BEARER_AUTH,
    )
    .addGlobalParameters({
      name: 'x-lang',
      in: 'header',
      required: false,
      description: 'Response language (vi | en)',
      schema: { type: 'string', enum: ['vi', 'en'], default: 'vi' },
    })
    .build();

  SwaggerModule.setup(
    SWAGGER_PATH,
    app,
    () => SwaggerModule.createDocument(app, config),
    {
      customSiteTitle: `${appName} API Docs`,
      jsonDocumentUrl: `${SWAGGER_PATH}/json`,
      swaggerOptions: { persistAuthorization: true },
    },
  );
}
