import { Module } from '@nestjs/common';
import { LoggerModule, EnvModule, DatabaseModule } from './config';
import { HealthModule, ProductModule } from './modules';

@Module({
  imports: [
    EnvModule,
    LoggerModule,
    DatabaseModule,
    ProductModule,
    HealthModule,
  ],
})
export class AppModule {}
