import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins.length === 0 ? true : corsOrigins,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');
  app.useStaticAssets(
    join(process.cwd(), process.env.LOCAL_AUDIO_STORAGE_DIR ?? 'storage/audio'),
    {
      prefix: normalizeStaticPrefix(process.env.LOCAL_AUDIO_PUBLIC_PATH ?? '/audio'),
    },
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('TalkTo Persona AI API')
    .setDescription('NestJS + PostgreSQL backend for TalkTo Persona AI MVP')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

function normalizeStaticPrefix(prefix: string): string {
  const normalized = prefix.startsWith('/') ? prefix : `/${prefix}`;
  return normalized.endsWith('/') ? normalized : `${normalized}/`;
}

bootstrap();
