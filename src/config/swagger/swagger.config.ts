import { DocumentBuilder, SwaggerCustomOptions } from '@nestjs/swagger';

/**
 * Validates required environment variables for Swagger documentation
 * @throws Error if any required environment variables are missing
 */
export function validateSwaggerEnvVars(): void {
  const requiredVars = [
    'APP_DOCUMENTATION_TITLE',
    'APP_DOCUMENTATION_DESCRIPTION',
    'VERSION',
    'SWAGGER_DOCUMENT_URL',
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables for Swagger documentation: ${missingVars.join(
        ', ',
      )}`,
    );
  }
}

/**
 * Creates a DocumentBuilder configuration for Swagger
 * @returns DocumentBuilder instance configured with environment variables
 */
export function createSwaggerConfig() {
  // Validate required environment variables
  validateSwaggerEnvVars();

  const builder = new DocumentBuilder()
    .setTitle(process.env.APP_DOCUMENTATION_TITLE)
    .setDescription(process.env.APP_DOCUMENTATION_DESCRIPTION)
    .setVersion(process.env.VERSION)
    .addBearerAuth();

  // Add server information based on environment
  const environment = process.env.ENVIRONMENT || 'development';
  const port = process.env.PORT || '3000';

  if (environment === 'development') {
    builder.addServer(`http://localhost:${port}`, 'Development Server');
  } else if (environment === 'staging') {
    builder.addServer('https://staging-api.example.com', 'Staging Server');
  } else if (environment === 'production') {
    builder.addServer('https://api.example.com', 'Production Server');
  }

  // Add tags for API categorization
  builder.addTag('auth', 'Authentication endpoints');
  builder.addTag('users', 'User management endpoints');
  builder.addTag('products', 'Product management endpoints');
  builder.addTag('orders', 'Order management endpoints');

  return builder.build();
}

/**
 * Custom Swagger options for UI customization
 */
export const swaggerCustomOptions: SwaggerCustomOptions = {
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    deepLinking: true,
  },
  customSiteTitle: process.env.APP_DOCUMENTATION_TITLE,
  customCss: '.swagger-ui .topbar { display: none }',
};

/**
 * Get the Swagger document URL from environment variables
 * @returns The URL path for Swagger documentation
 */
export function getSwaggerDocumentUrl(): string {
  validateSwaggerEnvVars();
  return process.env.SWAGGER_DOCUMENT_URL || 'api/docs';
}
