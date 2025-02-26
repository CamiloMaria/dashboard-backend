import { DocumentBuilder, SwaggerCustomOptions } from '@nestjs/swagger';
import { EnvService } from '../env/env.service';

/**
 * Creates a DocumentBuilder configuration for Swagger
 * @returns DocumentBuilder instance configured with environment variables
 */
export function createSwaggerConfig(envService: EnvService) {
  const builder = new DocumentBuilder()
    .setTitle(envService.documentationTitle)
    .setDescription(envService.documentationDescription)
    .setVersion(envService.version)
    .addBearerAuth();

  // Add server information based on environment
  const environment = envService.environment;
  const globalPrefix = envService.globalPrefix;
  const port = envService.port;

  if (environment === 'development') {
    builder.addServer(
      `http://localhost:${port}/${globalPrefix}`,
      'Development Server',
    );
  } else if (environment === 'staging') {
    builder.addServer('https://staging-api.example.com', 'Staging Server');
  } else if (environment === 'production') {
    builder.addServer('https://api.example.com', 'Production Server');
  }

  return builder.build();
}

/**
 * Custom Swagger options for UI customization
 */
export function getSwaggerCustomOptions(
  envService: EnvService,
): SwaggerCustomOptions {
  return {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      deepLinking: true,
    },
    customSiteTitle: envService.documentationTitle,
    customCss: '.swagger-ui .topbar { display: none }',
  };
}

/**
 * Get the Swagger document URL from environment variables
 * @returns The URL path for Swagger documentation
 */
export function getSwaggerDocumentUrl(envService: EnvService): string {
  return envService.swaggerDocumentUrl || 'api/docs';
}
