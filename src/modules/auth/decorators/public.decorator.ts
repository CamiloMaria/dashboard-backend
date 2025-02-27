import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark routes as public (no authentication required)
 * Use this decorator to exclude routes from requiring authentication
 * when using global JwtAuthGuard
 *
 * @example
 * ```typescript
 * @Public()
 * @Get('public-route')
 * getPublicData() { ... }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
