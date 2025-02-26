import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule, EnvModule, DatabaseModule } from './config';
import { HealthModule } from './modules';

@Module({
  imports: [EnvModule, LoggerModule, DatabaseModule, HealthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
