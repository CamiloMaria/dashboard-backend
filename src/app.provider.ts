import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Global providers for the application
 * These will be automatically applied to all routes unless specifically overridden
 */
export const APP_PROVIDERS = [
  {
    provide: APP_GUARD,
    useClass: ThrottlerGuard, // Apply rate limiting globally
  },
  {
    provide: APP_GUARD,
    useClass: JwtAuthGuard, // Apply JWT authentication globally
  },
  {
    provide: APP_GUARD,
    useClass: RolesGuard, // Apply roles guard globally
  },
];
