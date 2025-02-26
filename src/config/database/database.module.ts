import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvService } from '../env/env.service';
import { LoggerService } from '../logger/logger.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
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
  ],
})
export class DatabaseModule {}
