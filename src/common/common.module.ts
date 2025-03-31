import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ExternalApiService } from './services/external-api.service';
import { ResponseService } from './services/response.service';
import { InstaleapMapper } from './mappers';

@Global()
@Module({
  imports: [HttpModule, ConfigModule],
  providers: [ExternalApiService, ResponseService, InstaleapMapper],
  exports: [ExternalApiService, ResponseService, InstaleapMapper],
})
export class CommonModule {}
