import { Module } from '@nestjs/common';
import { LoggerModule, EnvModule, DatabaseModule } from './config';
import { HealthModule, ProductModule } from './modules';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    EnvModule,
    LoggerModule,
    DatabaseModule,
    ProductModule,
    HealthModule,
    AuthModule,
  ],
})
export class AppModule {}
