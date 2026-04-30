import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { resolveListenPort } from './config/server-defaults';

/** Default Express JSON limit is ~100kb; avatar/template uploads send base64 in JSON. */
const JSON_BODY_LIMIT = '15mb';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(json({ limit: JSON_BODY_LIMIT }));
  app.use(urlencoded({ extended: true, limit: JSON_BODY_LIMIT }));
  app.enableShutdownHooks();
  app.setGlobalPrefix('api');

  // Browsers and health probes often hit `/` — all Nest routes live under `/api`.
  app.getHttpAdapter().get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      ok: true,
      service: 'ViralThumblify API',
      health: '/api/health',
      docs: '/api/docs',
    });
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('ViralThumblify API')
    .setDescription(
      'ViralThumblify — auth, health, projects, templates, avatars, thumbnail generation, video→thumbnails (OpenRouter)',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = resolveListenPort();
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend running on http://0.0.0.0:${port}`);
}

bootstrap();
