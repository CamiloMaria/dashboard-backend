import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { EnvModule } from '../../config/env/env.module';
import { AuthService } from './services/auth.service';
import { PermissionsService } from './services/permissions.service';
import { AuthController } from './controllers/auth.controller';
import { WebUsersPermissions } from './entities/shop/web-user-permissions.entity';
import { DatabaseConnection } from '../../config/database/constants';
import { EnvService } from '../../config/env/env.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    ConfigModule,
    EnvModule,
    CommonModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
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
    PermissionsService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [AuthService, PermissionsService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
