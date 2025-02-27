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
import { UserLoginData } from '../interfaces/external-api.interface';
import { ExternalApiService } from './external-api.service';
import { PermissionsService } from './permissions.service';
import { LoggerService } from 'src/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly externalApiService: ExternalApiService,
    private readonly permissionsService: PermissionsService,
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
      this.logger.log(`Login attempt for user: ${loginDto.username}`);

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

      // Generate token
      const token = this.generateToken(payload);

      this.logger.log(`User ${loginDto.username} logged in successfully`);

      // Return token and user data
      return {
        access_token: token,
        user: payload,
      };
    } catch (error) {
      this.handleLoginError(error, loginDto.username);
    }
  }

  /**
   * Maps external API user data to our internal user details format
   * @param userData User data from external API
   * @returns Mapped user details
   */
  private mapToUserDetails(userData: UserLoginData): UserDetailsDto {
    return {
      id: userData.id,
      name: `${userData.nombre} ${userData.apellido}`,
      email: `${userData.usuario}@plazalama.com`,
      avatar: 'assets/images/avatars/user-128.png',
      status: Number(userData.status) === 1 ? 'online' : 'offline',
      username: userData.usuario,
    };
  }

  /**
   * Generates a JWT token from user payload
   * @param payload User data to include in token
   * @returns Signed JWT token
   */
  private generateToken(payload: UserPayloadDto): string {
    return this.jwtService.sign(payload);
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
