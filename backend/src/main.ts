import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');

  // Security
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
      new ValidationPipe({
          whitelist: true,
          transform: true,
          transformOptions: {
              enableImplicitConversion: true,
          },
      })
  );

  // Global prefix
  app.setGlobalPrefix('api');

  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
}

bootstrap();
