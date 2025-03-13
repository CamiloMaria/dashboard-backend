import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ExternalApiService } from './services/external-api.service';
import { ResponseService } from './services/response.service';

@Global()
@Module({
  imports: [HttpModule, ConfigModule],
  providers: [ExternalApiService, ResponseService],
  exports: [ExternalApiService, ResponseService],
})
export class CommonModule {}
