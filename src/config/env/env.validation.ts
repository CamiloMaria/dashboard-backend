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

  // TypeORM Configuration
  DB_TYPE: Joi.string()
    .valid('mysql', 'postgres', 'sqlite', 'mariadb', 'mssql')
    .default('mysql')
    .description('Database type for TypeORM'),
  DB_HOST: Joi.string()
    .default('localhost')
    .description('Database host for TypeORM'),
  DB_PORT: Joi.number()
    .port()
    .default(3306)
    .description('Database port for TypeORM'),
  DB_USERNAME: Joi.string().description('Database username for TypeORM'),
  DB_PASSWORD: Joi.string().description('Database password for TypeORM'),
  DB_DATABASE: Joi.string().required().description('Database name for TypeORM'),
  DB_SYNCHRONIZE: Joi.boolean()
    .default(false)
    .description(
      'Whether to synchronize database schema automatically (WARNING: not recommended for production)',
    ),
  DB_LOGGING: Joi.boolean()
    .default(true)
    .description('Whether to enable database query logging'),
  DB_AUTO_LOAD_ENTITIES: Joi.boolean()
    .default(true)
    .description('Whether to automatically load entities'),

  // Database - Secondary
  HOST_36: Joi.string().required().description('Secondary database host'),
  USERNAME_36: Joi.string()
    .required()
    .description('Secondary database username'),
  PASSWORD_36: Joi.string()
    .required()
    .description('Secondary database password'),
  DATABASE_36: Joi.string().required().description('Secondary database name'),

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
  INTRANET: Joi.string().uri().required().description('Intranet URL'),
  INSTALEAP_API_BASE_URL: Joi.string()
    .uri()
    .required()
    .description('Instaleap API base URL'),
  INSTALEAP_API_KEY: Joi.string().required().description('Instaleap API key'),
  E_COMMERCE_INSTALEAP: Joi.string()
    .uri()
    .required()
    .description('E-Commerce Instaleap URL'),
  CLOUDFLARE: Joi.string().uri().required().description('Cloudflare URL'),
  URL_CLOUDFLARE_SUFFIX: Joi.string()
    .required()
    .description('Cloudflare URL suffix'),
  BASE_CLOUDFLARE_IMG: Joi.string()
    .uri()
    .required()
    .description('Base Cloudflare image URL'),
  PTLOG_BASE_URL: Joi.string().uri().required().description('PTLOG base URL'),

  // Third-party APIs
  CHAT_GPT_API_KEY: Joi.string().required().description('ChatGPT API key'),
  CHAT_GPT_URL: Joi.string().uri().required().description('ChatGPT API URL'),
});
