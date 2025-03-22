import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigKeys } from './env.constants';
import { OracleConnectionOptions } from 'typeorm/driver/oracle/OracleConnectionOptions';
import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';

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
    return +this.configService.get<number>(ConfigKeys.SHOP_PORT);
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
  get hostIntranet(): string {
    return this.configService.get<string>(ConfigKeys.HOST_INTRANET);
  }

  get portIntranet(): number {
    return +this.configService.get<number>(ConfigKeys.PORT_INTRANET);
  }

  get usernameIntranet(): string {
    return this.configService.get<string>(ConfigKeys.USERNAME_INTRANET);
  }

  get passwordIntranet(): string {
    return this.configService.get<string>(ConfigKeys.PASSWORD_INTRANET);
  }

  get databaseIntranet(): string {
    return this.configService.get<string>(ConfigKeys.DATABASE_INTRANET);
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
  get intranetApiBaseUrl(): string {
    return this.configService.get<string>(ConfigKeys.INTRANET_API_BASE_URL);
  }

  get shopilamaApiBaseUrl(): string {
    return this.configService.get<string>(ConfigKeys.SHOPILAMA_API_BASE_URL);
  }

  get eCommerceInstaleapApiBaseUrl(): string {
    return this.configService.get<string>(
      ConfigKeys.ECOMMERCE_INSTALEAP_API_BASE_URL,
    );
  }

  get baseCloudflareImg(): string {
    return this.configService.get<string>(ConfigKeys.BASE_CLOUDFLARE_IMG);
  }

  get cloudflareImagePrefix(): string {
    return this.configService.get<string>(ConfigKeys.CLOUDFLARE_IMAGE_PREFIX);
  }

  get cloudflareBaseUrl(): string {
    return this.configService.get<string>(ConfigKeys.CLOUDFLARE_BASE_URL);
  }

  get cloudflareAccountId(): string {
    return this.configService.get<string>(ConfigKeys.CLOUDFLARE_ACCOUNT_ID);
  }

  get cloudflareApiToken(): string {
    return this.configService.get<string>(ConfigKeys.CLOUDFLARE_API_TOKEN);
  }

  get cloudflareImageDns(): string {
    return this.configService.get<string>(ConfigKeys.CLOUDFLARE_IMAGE_DNS);
  }

  get ptlogApiBaseUrl(): string {
    return this.configService.get<string>(ConfigKeys.PTLOG_API_BASE_URL);
  }

  // Third-party APIs
  get chatGptApiKey(): string {
    return this.configService.get<string>(ConfigKeys.CHAT_GPT_API_KEY);
  }

  get chatGptUrl(): string {
    return this.configService.get<string>(ConfigKeys.CHAT_GPT_BASE_URL);
  }

  get instaleapApiKey(): string {
    return this.configService.get<string>(ConfigKeys.INSTALEAP_API_KEY);
  }

  get instaleapBaseUrl(): string {
    return this.configService.get<string>(ConfigKeys.INSTALEAP_BASE_URL);
  }

  // Helper methods for database connection configs
  getShopDatabaseConfig(): MysqlConnectionOptions {
    return {
      type: 'mysql',
      host: this.shopHost,
      port: this.shopPort,
      username: this.shopUsername,
      password: this.shopPassword,
      database: this.shopDatabase,
      synchronize: false,
      logging: this.environment === 'development',
      entities: ['dist/**/entities/shop/*.entity{.ts,.js}'],
    };
  }

  getIntranetDatabaseConfig(): MysqlConnectionOptions {
    return {
      type: 'mysql',
      host: this.hostIntranet,
      port: this.portIntranet,
      username: this.usernameIntranet,
      password: this.passwordIntranet,
      database: this.databaseIntranet,
      synchronize: false,
      logging: this.environment === 'development',
      entities: ['dist/**/entities/intranet/*.entity{.ts,.js}'],
    };
  }

  getOracleDatabaseConfig(): OracleConnectionOptions {
    return {
      type: 'oracle',
      username: this.oracleUsername,
      password: this.oraclePassword,
      connectString: this.oracleConnString,
      synchronize: false,
      logging: this.environment === 'development',
      entities: ['dist/**/entities/oracle/*.entity{.ts,.js}'],
      thickMode: true,
    };
  }
}
