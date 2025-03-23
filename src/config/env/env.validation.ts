import Joi from 'joi';

/**
 * Validation schema for environment variables
 * This ensures all required environment variables are present
 * and valid at application startup
 */
export const envValidationSchema = Joi.object({
  // API Documentation
  APP_DOCUMENTATION_TITLE: Joi.string()
    .required()
    .description('Title for the API documentation'),
  APP_DOCUMENTATION_DESCRIPTION: Joi.string()
    .required()
    .description('Description for the API documentation'),
  VERSION: Joi.string()
    .required()
    .pattern(/^\d+\.\d+\.\d+$/)
    .description('API version in semantic versioning format (x.y.z)'),
  ENVIRONMENT: Joi.string()
    .valid('development', 'production', 'staging', 'test')
    .default('development')
    .description('Current environment'),
  SWAGGER_DOCUMENT_URL: Joi.string()
    .required()
    .description('URL path for Swagger documentation'),

  // Server
  PORT: Joi.number()
    .port()
    .default(3000)
    .description('Port on which the application runs'),
  GLOBAL_PREFIX: Joi.string()
    .default('api')
    .description('Global prefix for all API routes'),
  API_SECRET: Joi.string()
    .required()
    .description('Secret key for API security'),

  // Authentication
  JWT_SECRET_KEY: Joi.string()
    .required()
    .description('Secret key for JWT token signing'),
  JWT_EXPIRATION_TIME: Joi.string()
    .required()
    .description('JWT token expiration time'),
  JWT_REFRESH_SECRET_KEY: Joi.string()
    .required()
    .description('Secret key for JWT refresh token signing'),
  JWT_REFRESH_EXPIRATION_TIME: Joi.string()
    .required()
    .description('JWT refresh token expiration time'),

  // Cookie Configuration
  COOKIE_SECRET: Joi.string()
    .required()
    .description('Secret key for cookie signing'),
  COOKIE_NAME: Joi.string()
    .default('auth_token')
    .description('Name of the auth cookie'),
  COOKIE_DOMAIN: Joi.string().description('Domain for the cookie'),
  COOKIE_PATH: Joi.string().default('/').description('Path for the cookie'),
  COOKIE_SECURE: Joi.boolean()
    .default(false)
    .description('Whether the cookie should only be sent over HTTPS'),
  COOKIE_HTTP_ONLY: Joi.boolean()
    .default(true)
    .description('Whether the cookie should be httpOnly'),
  COOKIE_SAME_SITE: Joi.string()
    .valid('strict', 'lax', 'none')
    .default('lax')
    .description('SameSite attribute for the cookie'),

  // Database Configuration - Shopilama
  SHOP_HOST: Joi.string().required().description('Shopilama database host'),
  SHOP_PORT: Joi.number()
    .port()
    .required()
    .description('Shopilama database port'),
  SHOP_USERNAME: Joi.string()
    .required()
    .description('Shopilama database username'),
  SHOP_PASSWORD: Joi.string()
    .required()
    .description('Shopilama database password'),
  SHOP_DATABASE: Joi.string().required().description('Shopilama database name'),

  // Database - Intranet
  HOST_INTRANET: Joi.string().required().description('Intranet database host'),
  PORT_INTRANET: Joi.number()
    .port()
    .required()
    .description('Intranet database port'),
  USERNAME_INTRANET: Joi.string()
    .required()
    .description('Intranet database username'),
  PASSWORD_INTRANET: Joi.string()
    .required()
    .description('Intranet database password'),
  DATABASE_INTRANET: Joi.string()
    .required()
    .description('Intranet database name'),

  // Oracle Database
  ORACLE_USERNAME: Joi.string()
    .required()
    .description('Oracle database username'),
  ORACLE_PASSWORD: Joi.string()
    .required()
    .description('Oracle database password'),
  DBLINK: Joi.string().required().description('Oracle database link'),
  ORACLE_CONNSTRING: Joi.string()
    .required()
    .description('Oracle connection string'),

  // External Services
  INTRANET_API_BASE_URL: Joi.string()
    .uri()
    .required()
    .description('Intranet URL'),
  SHOPILAMA_API_BASE_URL: Joi.string()
    .uri()
    .required()
    .description('Shopilama API base URL'),
  ECOMMERCE_INSTALEAP_API_BASE_URL: Joi.string()
    .uri()
    .required()
    .description('E-Commerce Instaleap URL'),
  BASE_CLOUDFLARE_IMG: Joi.string()
    .uri()
    .required()
    .description('Base Cloudflare image URL'),
  CLOUDFLARE_IMAGE_PREFIX: Joi.string()
    .uri()
    .required()
    .description('Cloudflare image prefix'),

  PTLOG_API_BASE_URL: Joi.string()
    .uri()
    .required()
    .description('PTLOG base URL'),

  // Third-party APIs
  CHAT_GPT_API_KEY: Joi.string().required().description('ChatGPT API key'),
  CHAT_GPT_BASE_URL: Joi.string()
    .uri()
    .required()
    .description('ChatGPT API base URL'),

  INSTALEAP_API_KEY: Joi.string().required().description('Instaleap API key'),
  INSTALEAP_API_BASE_URL: Joi.string()
    .uri()
    .required()
    .description('Instaleap base URL'),

  CLOUDFLARE_BASE_URL: Joi.string()
    .uri()
    .required()
    .description('Cloudflare base URL'),
  CLOUDFLARE_ACCOUNT_ID: Joi.string()
    .required()
    .description('Cloudflare account ID'),
  CLOUDFLARE_API_TOKEN: Joi.string()
    .required()
    .description('Cloudflare API token'),
  CLOUDFLARE_IMAGE_DNS: Joi.string()
    .uri()
    .required()
    .description('Cloudflare image DNS'),
});
