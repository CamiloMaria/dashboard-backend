import { Request } from 'express';
import { ExtractJwt } from 'passport-jwt';
import { EnvService } from '../../../config/env/env.service';

/**
 * Creates a function that extracts JWT tokens from multiple sources:
 * 1. From the Authorization header (Bearer token)
 * 2. From cookies
 *
 * @param envService The environment service to get cookie name
 * @returns A function that extracts the JWT token from a request
 */
export const createJwtExtractor = (envService: EnvService) => {
  // Get the standard header extractor
  const fromAuthHeader = ExtractJwt.fromAuthHeaderAsBearerToken();

  // Create the cookie extractor
  const fromCookie = (request: Request): string | null => {
    if (request && request.cookies && request.cookies[envService.cookieName]) {
      return request.cookies[envService.cookieName];
    }
    return null;
  };

  // Return a combined extractor that tries both methods
  return (request: Request): string | null => {
    // First try the Authorization header
    const token = fromAuthHeader(request);
    if (token) {
      return token;
    }

    // Then try cookies
    return fromCookie(request);
  };
};
