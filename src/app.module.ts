import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule, EnvModule } from './config';

@Module({
  imports: [EnvModule, LoggerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
