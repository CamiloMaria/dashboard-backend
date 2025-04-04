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
import { UserEntity } from './entities/intranet';
import { UserService } from './services/user.service';

@Module({
  imports: [
    ConfigModule,
    EnvModule,
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
    TypeOrmModule.forFeature([UserEntity], DatabaseConnection.INTRANET),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PermissionsService,
    UserService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    AuthService,
    PermissionsService,
    UserService,
    JwtAuthGuard,
    RolesGuard,
  ],
})
export class AuthModule {}
