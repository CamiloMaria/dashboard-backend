import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EnvModule } from '../../config/env/env.module';
import { AuthService } from './services/auth.service';
import { ExternalApiService } from './services/external-api.service';
import { PermissionsService } from './services/permissions.service';
import { AuthController } from './controllers/auth.controller';
import { WebUsersPermissions } from './entities/web-user-permissions.entity';
import { DatabaseConnection } from '../../config/database/constants';
import { EnvService } from '../../config/env/env.service';

@Module({
  imports: [
    ConfigModule,
    EnvModule,
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
  providers: [AuthService, ExternalApiService, PermissionsService],
  exports: [AuthService, PermissionsService],
})
export class AuthModule {}
