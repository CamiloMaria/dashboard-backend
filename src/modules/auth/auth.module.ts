import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PassportModule } from '@nestjs/passport';
import { EnvModule } from '../../config/env/env.module';
import { AuthService } from './services/auth.service';
import { ExternalApiService } from './services/external-api.service';
import { PermissionsService } from './services/permissions.service';
import { AuthController } from './controllers/auth.controller';
import { WebUsersPermissions } from './entities/shop/web-user-permissions.entity';
import { DatabaseConnection } from '../../config/database/constants';
import { EnvService } from '../../config/env/env.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    ConfigModule,
    EnvModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // Rate limiting to prevent brute force attacks
    ThrottlerModule.forRootAsync({
      imports: [EnvModule],
      inject: [EnvService],
      useFactory: () => [
        {
          ttl: 60000, // 1 minute
          limit: 5, // 5 requests per minute
          // Specific throttling for login endpoints
          ignoreUserAgents: [],
        },
      ],
    }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
      headers: {
        'Content-Type': 'application/json',
      },
    }),
    JwtModule.registerAsync({
      imports: [EnvModule],
      inject: [EnvService],
      useFactory: (envService: EnvService) => ({
        secret: envService.jwtSecret,
        signOptions: {
          expiresIn: envService.jwtExpirationTime,
        },
      }),
    }),
    TypeOrmModule.forFeature([WebUsersPermissions], DatabaseConnection.SHOP),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    ExternalApiService,
    PermissionsService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [AuthService, PermissionsService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
