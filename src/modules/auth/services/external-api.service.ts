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
      const url = `${this.envService.intranetApiBaseUrl}/auth_ctrl/login`;

      const body = this.getQueryStringParameters({
        usuario: username,
        password,
      });

      const response = await firstValueFrom(
        this.httpService.post<UserLoginResponse>(url, body, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000, // 10 seconds
        }),
      );

      if (response.data.error) {
        throw new UnauthorizedException('Invalid credentials');
      }

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

  private getQueryStringParameters(obj) {
    return Object.keys(obj)
      .map((key) => key + '=' + obj[key])
      .join('&');
  }
}
