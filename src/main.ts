import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, LoggerService } from './config';
import cookieParser from 'cookie-parser';
import { EnvService } from './config/env/env.service';

async function bootstrap() {
  // Create app with default logger temporarily
  const app = await NestFactory.create(AppModule);

  // Get our custom logger from the app
  const logger = app.get(LoggerService);

  // Get environment service for configuration
  const envService = app.get(EnvService);

  // Enable CORS with credentials
  app.enableCors({
    origin: true, // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true, // Important for cookies to work with cross-origin requests
  });

  // Setup cookie parser middleware with the configured secret
  app.use(cookieParser(envService.cookieSecret));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const globalPrefix = envService.globalPrefix || 'api';
  app.setGlobalPrefix(globalPrefix);

  // Setup Swagger using environment variables
  SwaggerModule.setup(app);

  // Start the server
  const port = envService.port || 3000;
  await app.listen(port);
  logger.log(
    `Application is running on: http://localhost:${port}/${globalPrefix}`,
    'Bootstrap',
  );
}
bootstrap();
