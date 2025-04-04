import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ExternalApiService } from './services/external-api.service';
import { ResponseService } from './services/response.service';
import { InstaleapMapper } from './mappers';
import { UserLogsService } from './services/user-logs.service';
import { UsersLogsEntity } from 'src/modules/auth/entities/shop/user-logs.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseConnection } from 'src/config';

@Global()
@Module({
  imports: [
    HttpModule,
    ConfigModule,
    TypeOrmModule.forFeature([UsersLogsEntity], DatabaseConnection.SHOP),
  ],
  providers: [
    ExternalApiService,
    ResponseService,
    InstaleapMapper,
    UserLogsService,
  ],
  exports: [
    ExternalApiService,
    ResponseService,
    InstaleapMapper,
    UserLogsService,
  ],
})
export class CommonModule {}
