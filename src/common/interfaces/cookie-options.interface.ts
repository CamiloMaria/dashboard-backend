import { CookieOptions } from 'express';

/**
 * Interface for auth cookie configuration
 */
export interface AuthCookieOptions extends CookieOptions {
  name: string;
}

/**
 * Interface for token response with cookie information
 */
export interface TokenResponse {
  token: string;
  cookieOptions: AuthCookieOptions;
}

/**
 * Interface for token refresh response
 */
export interface RefreshTokenResponse extends TokenResponse {
  refreshToken?: string;
  refreshCookieOptions?: AuthCookieOptions;
}
