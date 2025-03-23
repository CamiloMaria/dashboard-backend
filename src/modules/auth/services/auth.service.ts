import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { LoginDto } from '../dto/login.dto';
import {
  UserLoginResponseDto,
  UserDetailsDto,
  UserPayloadDto,
} from '../dto/auth-response.dto';
import { UserLoginData } from '../../../common/interfaces/user-api.interface';
import { ExternalApiService } from '../../../common/services/external-api.service';
import { PermissionsService } from './permissions.service';
import { LoggerService } from 'src/config/logger/logger.service';
import { EnvService } from '../../../config/env/env.service';
import {
  AuthCookieOptions,
  TokenResponse,
  RefreshTokenResponse,
} from '../../../common/interfaces/cookie-options.interface';

/**
 * Service for authentication operations
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly externalApiService: ExternalApiService,
    private readonly permissionsService: PermissionsService,
    private readonly envService: EnvService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Authenticates a user and generates a JWT token
   * @param loginDto User credentials
   * @returns JWT token and user information
   * @throws UnauthorizedException for invalid credentials
   * @throws InternalServerErrorException for unexpected errors
   */
  async login(loginDto: LoginDto): Promise<UserLoginResponseDto> {
    try {
      // Validate user using external API
      const externalUser = await this.externalApiService.validateUser(
        loginDto.username,
        loginDto.password,
      );

      if (!externalUser?.row) {
        throw new UnauthorizedException(
          'Invalid user data received from authentication service',
        );
      }

      // Map to user details
      const userDetails = this.mapToUserDetails(externalUser.row);

      // Get user permissions
      const userPermissions = await this.permissionsService.getUserPermissions(
        loginDto.username,
      );

      // Create JWT payload
      const payload: UserPayloadDto = {
        username: userDetails.username,
        sub: userDetails.id,
        email: userDetails.email,
        allowedPages: userPermissions.allowedPages,
      };

      // Generate tokens with cookie options
      const { token: accessToken, cookieOptions: accessCookieOptions } =
        this.generateAccessToken(payload);
      const { token: refreshToken, cookieOptions: refreshCookieOptions } =
        this.generateRefreshToken(payload.sub);

      // Return token, cookie options, and user data
      return {
        // We still include these in the object for now, but they'll be removed in the controller
        access_token: accessToken,
        refresh_token: refreshToken,
        access_cookie: accessCookieOptions,
        refresh_cookie: refreshCookieOptions,
        user: payload,
      };
    } catch (error) {
      return this.handleLoginError(error, loginDto.username);
    }
  }

  /**
   * Generate an access token with cookie options
   * @param payload The user payload to encode in the token
   * @returns Object containing the token and cookie options
   */
  generateAccessToken(payload: UserPayloadDto): TokenResponse {
    const token = this.jwtService.sign(payload);

    // Create cookie options
    const cookieOptions: AuthCookieOptions = {
      name: this.envService.cookieName,
      httpOnly: this.envService.cookieHttpOnly,
      secure: this.envService.cookieSecure,
      sameSite: this.envService.cookieSameSite,
      maxAge: this.calculateMaxAge(this.envService.jwtExpirationTime),
      path: this.envService.cookiePath,
    };

    // Set domain if configured
    if (this.envService.cookieDomain) {
      cookieOptions.domain = this.envService.cookieDomain;
    }

    this.logger.debug(
      `Access token cookie configured: ${JSON.stringify({
        name: cookieOptions.name,
        path: cookieOptions.path,
        maxAge: cookieOptions.maxAge,
        httpOnly: cookieOptions.httpOnly,
        secure: cookieOptions.secure,
        sameSite: cookieOptions.sameSite,
        domain: cookieOptions.domain || 'not set',
      })}`,
    );

    return { token, cookieOptions };
  }

  /**
   * Generate a refresh token for a user
   * @param userId The user ID to include in the token
   * @returns The refresh token and cookie options
   */
  private generateRefreshToken(userId: string): RefreshTokenResponse {
    const token = this.jwtService.sign(
      { sub: userId, isRefreshToken: true },
      {
        secret: this.envService.jwtRefreshSecret,
        expiresIn: this.envService.jwtRefreshExpiresIn,
      },
    );

    const cookieOptions: AuthCookieOptions = {
      name: `refresh_${this.envService.cookieName}`,
      httpOnly: this.envService.cookieHttpOnly,
      secure: this.envService.cookieSecure,
      sameSite: this.envService.cookieSameSite,
      path: '/api/auth/refresh', // Only send to refresh endpoint
      domain: this.envService.cookieDomain,
      maxAge: this.calculateMaxAge(this.envService.jwtRefreshExpiresIn),
    };

    return { token, cookieOptions };
  }

  /**
   * Calculate maxAge in milliseconds from expiration string
   * @param expiration Expiration time string (e.g., '1h', '7d')
   * @returns Expiration time in milliseconds
   */
  private calculateMaxAge(expiration: string): number {
    const unit = expiration.charAt(expiration.length - 1);
    const value = parseInt(expiration.slice(0, -1));

    switch (unit) {
      case 's':
        return value * 1000; // seconds to ms
      case 'm':
        return value * 60 * 1000; // minutes to ms
      case 'h':
        return value * 60 * 60 * 1000; // hours to ms
      case 'd':
        return value * 24 * 60 * 60 * 1000; // days to ms
      default:
        // If the format is not recognized, default to 1 day
        return 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Verify and refresh an access token using a refresh token
   * @param refreshToken The refresh token to validate
   * @returns New access token with cookie options
   * @throws UnauthorizedException if refresh token is invalid
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    try {
      // Verify the refresh token using the refresh token secret
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.envService.jwtRefreshSecret,
      });

      // Check if it's actually a refresh token
      if (!payload.isRefreshToken) {
        throw new UnauthorizedException('Invalid token type');
      }

      // Get the user ID from the token payload
      const userId = payload.sub;
      if (!userId) {
        throw new UnauthorizedException('Invalid token payload');
      }

      this.logger.debug(`Refreshing token for user ID: ${userId}`);

      // Generate a new access token with minimal claims
      // The full user details will be loaded when they access protected resources
      const token = this.jwtService.sign({ sub: userId });

      // Create cookie options for the new token
      const cookieOptions: AuthCookieOptions = {
        name: this.envService.cookieName,
        httpOnly: this.envService.cookieHttpOnly,
        secure: this.envService.cookieSecure,
        sameSite: this.envService.cookieSameSite,
        path: '/', // Root path for general access
        maxAge: this.calculateMaxAge(this.envService.jwtExpirationTime),
      };

      // Set domain if configured
      if (this.envService.cookieDomain) {
        cookieOptions.domain = this.envService.cookieDomain;
      }

      this.logger.debug(
        `Created new access token cookie: ${cookieOptions.name}`,
      );

      return { token, cookieOptions };
    } catch (error) {
      this.logger.error(
        `Failed to refresh token: ${error.message}`,
        error.stack,
      );
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Invalidate tokens (for logout)
   * @returns Cookie options configured to expire the cookies
   */
  logout(): {
    accessCookie: AuthCookieOptions;
    refreshCookie: AuthCookieOptions;
  } {
    // Create cookie options that will expire the cookies
    const accessCookie: AuthCookieOptions = {
      name: this.envService.cookieName,
      httpOnly: this.envService.cookieHttpOnly,
      secure: this.envService.cookieSecure,
      sameSite: this.envService.cookieSameSite,
      path: '/', // Root path for general access
      maxAge: 0, // Expire immediately
    };

    const refreshCookie: AuthCookieOptions = {
      name: `refresh_${this.envService.cookieName}`,
      httpOnly: true,
      secure: this.envService.cookieSecure,
      sameSite: this.envService.cookieSameSite,
      path: '/api/auth/refresh', // Update path to match the refresh endpoint
      maxAge: 0, // Expire immediately
    };

    // Set domain if configured
    if (this.envService.cookieDomain) {
      accessCookie.domain = this.envService.cookieDomain;
      refreshCookie.domain = this.envService.cookieDomain;
    }

    return { accessCookie, refreshCookie };
  }

  /**
   * Maps raw user data to a standardized format
   * @param userData Raw user data from external API
   * @returns Mapped user details
   */
  private mapToUserDetails(userData: UserLoginData): UserDetailsDto {
    return {
      id: userData.id,
      name: `${userData.nombre} ${userData.apellido || ''}`,
      email: userData.email || `${userData.usuario}@plazalama.com`,
      avatar: userData.photo_url || 'assets/images/avatars/user-128.png',
      status: Number(userData.status) === 1 ? 'online' : 'offline',
      username: userData.usuario,
    };
  }

  /**
   * Handles login errors with appropriate logging and error propagation
   * @param error The error that occurred
   * @param username The username that was attempting to log in
   * @throws Original error or wrapped error with appropriate HTTP status
   */
  private handleLoginError(error: any, username: string): never {
    if (error instanceof UnauthorizedException || error.status === 401) {
      this.logger.warn(
        `Login failed for user ${username}: Invalid credentials`,
      );
      throw error;
    }

    this.logger.error(
      `Login error for user ${username}: ${error.message}`,
      error.stack,
    );

    throw new InternalServerErrorException(
      'An error occurred during login. Please try again later.',
      { cause: error },
    );
  }
}
