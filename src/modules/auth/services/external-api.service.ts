import {
  Injectable,
  Logger,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { EnvService } from '../../../config/env/env.service';
import { UserLoginResponse } from '../interfaces/external-api.interface';

@Injectable()
export class ExternalApiService {
  private readonly logger = new Logger(ExternalApiService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly envService: EnvService,
  ) {}

  /**
   * Validates user credentials against the external intranet API
   * @param username User's username
   * @param password User's password
   * @returns User data from external API if authentication succeeds
   * @throws UnauthorizedException if credentials are invalid
   * @throws InternalServerErrorException if API connection fails
   */
  async validateUser(
    username: string,
    password: string,
  ): Promise<UserLoginResponse> {
    try {
      const url = this.envService.intranet;

      this.logger.debug(
        `Authenticating user "${username}" against external API`,
      );

      const response = await firstValueFrom(
        this.httpService.post<UserLoginResponse>(
          url,
          { username, password },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000, // 10 seconds
          },
        ),
      );

      if (response.data.error) {
        this.logger.warn(`Failed login attempt for user: ${username}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      this.logger.debug(`User "${username}" authenticated successfully`);
      return response.data;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(
        `External API authentication error: ${error.message}`,
        error.stack,
      );

      throw new InternalServerErrorException(
        'Error connecting to authentication service',
        { cause: error },
      );
    }
  }
}
