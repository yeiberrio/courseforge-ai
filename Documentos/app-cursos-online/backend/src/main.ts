import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

mkdirSync(join(process.cwd(), 'uploads', 'documents'), { recursive: true });
mkdirSync(join(process.cwd(), 'uploads', 'generated'), { recursive: true });

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api/v1');

  // Serve generated files (videos, audio, slides)
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')
    : true;

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('CourseForge AI API')
      .setDescription('API para la plataforma de cursos online con IA')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`CourseForge API v1.0 running on http://localhost:${port}`);
}
bootstrap();
