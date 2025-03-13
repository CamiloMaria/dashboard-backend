import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule, EnvModule, DatabaseModule } from './config';
import { HealthModule, ProductModule } from './modules';
import { AuthModule } from './modules/auth/auth.module';
import { APP_PROVIDERS } from './app.provider';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    EnvModule,
    LoggerModule,
    DatabaseModule,
    CommonModule,
    // Global rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // Time to live - 60 seconds (in milliseconds)
        limit: 20, // 20 requests per ttl
      },
    ]),
    ProductModule,
    HealthModule,
    AuthModule,
  ],
  controllers: [],
  providers: [...APP_PROVIDERS],
})
export class AppModule {}
