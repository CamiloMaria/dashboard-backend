import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigKeys } from './env.constants';

/**
 * Service for type-safe access to environment variables
 */
@Injectable()
export class EnvService {
  constructor(private configService: ConfigService) {}

  // API Documentation
  get documentationTitle(): string {
    return this.configService.get<string>(ConfigKeys.APP_DOCUMENTATION_TITLE);
  }

  get documentationDescription(): string {
    return this.configService.get<string>(
      ConfigKeys.APP_DOCUMENTATION_DESCRIPTION,
    );
  }

  get version(): string {
    return this.configService.get<string>(ConfigKeys.VERSION);
  }

  get environment(): string {
    return this.configService.get<string>(
      ConfigKeys.ENVIRONMENT,
      'development',
    );
  }

  get swaggerDocumentUrl(): string {
    return this.configService.get<string>(ConfigKeys.SWAGGER_DOCUMENT_URL);
  }

  // Server
  get port(): number {
    return this.configService.get<number>(ConfigKeys.PORT, 3000);
  }

  get globalPrefix(): string {
    return this.configService.get<string>(ConfigKeys.GLOBAL_PREFIX, 'api');
  }

  get apiSecret(): string {
    return this.configService.get<string>(ConfigKeys.API_SECRET);
  }

  // Authentication
  get jwtSecret(): string {
    return this.configService.get<string>(ConfigKeys.JWT_SECRET_KEY);
  }

  get jwtExpirationTime(): string {
    return this.configService.get<string>(ConfigKeys.JWT_EXPIRATION_TIME);
  }

  // Database - Shopilama
  get shopHost(): string {
    return this.configService.get<string>(ConfigKeys.SHOP_HOST);
  }

  get shopPort(): number {
    return this.configService.get<number>(ConfigKeys.SHOP_PORT);
  }

  get shopUsername(): string {
    return this.configService.get<string>(ConfigKeys.SHOP_USERNAME);
  }

  get shopPassword(): string {
    return this.configService.get<string>(ConfigKeys.SHOP_PASSWORD);
  }

  get shopDatabase(): string {
    return this.configService.get<string>(ConfigKeys.SHOP_DATABASE);
  }

  // Database - Secondary
  get host36(): string {
    return this.configService.get<string>(ConfigKeys.HOST_36);
  }

  get username36(): string {
    return this.configService.get<string>(ConfigKeys.USERNAME_36);
  }

  get password36(): string {
    return this.configService.get<string>(ConfigKeys.PASSWORD_36);
  }

  get database36(): string {
    return this.configService.get<string>(ConfigKeys.DATABASE_36);
  }

  // Database - Oracle
  get oracleUsername(): string {
    return this.configService.get<string>(ConfigKeys.ORACLE_USERNAME);
  }

  get oraclePassword(): string {
    return this.configService.get<string>(ConfigKeys.ORACLE_PASSWORD);
  }

  get dbLink(): string {
    return this.configService.get<string>(ConfigKeys.DBLINK);
  }

  get oracleConnString(): string {
    return this.configService.get<string>(ConfigKeys.ORACLE_CONNSTRING);
  }

  // External Services
  get intranet(): string {
    return this.configService.get<string>(ConfigKeys.INTRANET);
  }

  get instaleapApiBaseUrl(): string {
    return this.configService.get<string>(ConfigKeys.INSTALEAP_API_BASE_URL);
  }

  get instaleapApiKey(): string {
    return this.configService.get<string>(ConfigKeys.INSTALEAP_API_KEY);
  }

  get eCommerceInstaleap(): string {
    return this.configService.get<string>(ConfigKeys.E_COMMERCE_INSTALEAP);
  }

  get cloudflare(): string {
    return this.configService.get<string>(ConfigKeys.CLOUDFLARE);
  }

  get urlCloudflareSuffix(): string {
    return this.configService.get<string>(ConfigKeys.URL_CLOUDFLARE_SUFFIX);
  }

  get baseCloudflareImg(): string {
    return this.configService.get<string>(ConfigKeys.BASE_CLOUDFLARE_IMG);
  }

  get ptlogBaseUrl(): string {
    return this.configService.get<string>(ConfigKeys.PTLOG_BASE_URL);
  }

  // Third-party APIs
  get chatGptApiKey(): string {
    return this.configService.get<string>(ConfigKeys.CHAT_GPT_API_KEY);
  }

  get chatGptUrl(): string {
    return this.configService.get<string>(ConfigKeys.CHAT_GPT_URL);
  }

  // Helper methods for database connection configs
  getShopDatabaseConfig() {
    return {
      host: this.shopHost,
      port: this.shopPort,
      username: this.shopUsername,
      password: this.shopPassword,
      database: this.shopDatabase,
    };
  }

  getSecondary36DatabaseConfig() {
    return {
      host: this.host36,
      username: this.username36,
      password: this.password36,
      database: this.database36,
    };
  }

  getOracleDatabaseConfig() {
    return {
      username: this.oracleUsername,
      password: this.oraclePassword,
      dbLink: this.dbLink,
      connectionString: this.oracleConnString,
    };
  }
}
