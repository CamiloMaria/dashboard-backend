import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './env.validation';
import { EnvService } from './env.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false, // Show all validation errors at once
        allowUnknown: true, // Allow unknown env vars
      },
    }),
  ],
  providers: [EnvService],
  exports: [EnvService],
})
export class EnvModule {}
