import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, LoggerService } from './config';

async function bootstrap() {
  // Create app with default logger temporarily
  const app = await NestFactory.create(AppModule);

  // Get our custom logger from the app
  const logger = app.get(LoggerService);

  // Enable CORS
  app.enableCors();

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Setup Swagger using environment variables
  SwaggerModule.setup(app);

  // Start the server
  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(
    `Application is running on: http://localhost:${port}`,
    'Bootstrap',
  );
}
bootstrap();
