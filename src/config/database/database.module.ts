import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvService } from '../env/env.service';
import { LoggerService } from '../logger/logger.service';
import { DatabaseConnection } from './constants';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      name: DatabaseConnection.SHOP,
      useFactory: (envService: EnvService, logger: LoggerService) => {
        const config = envService.getShopDatabaseConfig();
        logger.log(
          `TypeORM connected to ${config.database} database`,
          'DatabaseModule',
        );
        return config;
      },
      inject: [EnvService, LoggerService],
    }),
    TypeOrmModule.forRootAsync({
      name: DatabaseConnection.INTRANET36,
      useFactory: (envService: EnvService, logger: LoggerService) => {
        const config = envService.getIntranet36DatabaseConfig();
        logger.log(
          `TypeORM connected to ${config.database} database`,
          'DatabaseModule',
        );
        return config;
      },
      inject: [EnvService, LoggerService],
    }),
    TypeOrmModule.forRootAsync({
      name: DatabaseConnection.ORACLE,
      useFactory: (envService: EnvService, logger: LoggerService) => {
        const config = envService.getOracleDatabaseConfig();
        logger.log('TypeORM connected to SAP database', 'DatabaseModule');
        return config;
      },
      inject: [EnvService, LoggerService],
    }),
  ],
})
export class DatabaseModule {}
