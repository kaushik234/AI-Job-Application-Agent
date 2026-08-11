import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { logger } from '@sentinel/shared';
import helmet from 'helmet';
import compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Global API prefixes and routes definition
  app.setGlobalPrefix('api');

  // OWASP Helmets & Compressions
  app.use(helmet());
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
  }));

  // Global Validation Pipe with strict settings to avoid payload pollution (OWASP)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  // Secure CORS policy mapping
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost', 'http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1'];

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy (Production Hardening)'));
      }
    },
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SENTINEL AI - Autonomous Job Application Agent API')
    .setDescription(
      'Production-ready NestJS API with JWT Authentication, Refresh Tokens, RBAC, OAuth (Google & GitHub), Session Management, and PostgreSQL Database.'
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT Bearer Token',
        in: 'header',
      },
      'bearer'
    )
    .addTag('Auth')
    .addTag('User')
    .addTag('Job')
    .addTag('Resume')
    .addTag('CoverLetter')
    .addTag('Automation')
    .addTag('Gemini')
    .addTag('Storage')
    .addTag('Email')
    .addTag('Dashboard')
    .addTag('Queue')
    .addTag('Settings')
    .addTag('Health')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  logger.info('SEARCH', `Backend API running on http://0.0.0.0:${port}/api`);
  logger.info('SEARCH', `Swagger documentation live at http://0.0.0.0:${port}/api/docs`);
}

bootstrap().catch((err) => {
  console.error('Fatal backend startup error:', err);
  process.exit(1);
});
