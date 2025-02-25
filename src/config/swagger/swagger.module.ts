import { Module } from '@nestjs/common';
import { SwaggerModule as NestSwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import {
  createSwaggerConfig,
  getSwaggerDocumentUrl,
  swaggerCustomOptions,
} from './swagger.config';
import { LoggerService } from '../logger/logger.service';

@Module({})
export class SwaggerModule {
  /**
   * Sets up Swagger documentation for the application
   * @param app NestJS application instance
   */
  static setup(app: INestApplication): void {
    // Get the logger service from the app
    const logger = app.get(LoggerService);

    try {
      const config = createSwaggerConfig();
      const document = NestSwaggerModule.createDocument(app, config);
      const documentUrl = getSwaggerDocumentUrl();

      NestSwaggerModule.setup(documentUrl, app, document, swaggerCustomOptions);

      logger.log(
        `Swagger documentation available at /${documentUrl}`,
        'SwaggerModule',
      );
    } catch (error) {
      logger.error(
        `Failed to set up Swagger documentation: ${error.message}`,
        error.stack,
        'SwaggerModule',
      );
      // Don't throw the error to allow the application to start without Swagger
      // if environment variables are missing
    }
  }
}
