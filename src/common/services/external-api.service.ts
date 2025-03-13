import {
  Injectable,
  Logger,
  UnauthorizedException,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { EnvService } from '../../config/env/env.service';
import { UserLoginResponse } from '../interfaces/user-api.interface';
import {
  ChatGptMessage,
  ChatGptRequestBody,
  ChatGptResponse,
} from '../interfaces/chat-gpt-api.interface';
import axios from 'axios';

@Injectable()
export class ExternalApiService {
  private readonly logger = new Logger(ExternalApiService.name);

  private readonly intranetApiBaseUrl: string;
  private readonly shopilamaApiBaseUrl: string;

  private readonly chatGptUrl: string;
  private readonly chatGptApiKey: string;
  private readonly DEFAULT_GPT_MODEL = 'gpt-4o-mini';
  private readonly DEFAULT_MAX_TOKENS = 500;
  private readonly DEFAULT_TEMPERATURE = 0.7;

  constructor(
    private readonly httpService: HttpService,
    private readonly envService: EnvService,
  ) {
    this.intranetApiBaseUrl = this.envService.intranetApiBaseUrl;
    this.shopilamaApiBaseUrl = this.envService.shopilamaApiBaseUrl;
    this.chatGptUrl = this.envService.chatGptUrl;
    this.chatGptApiKey = this.envService.chatGptApiKey;
  }

  /**
   * Validates user credentials against the external intranet API
   * @param username User's username
   * @param password User's password
   * @returns User data from external API if authentication succeeds
   * @throws UnauthorizedException if credentials are invalid
   * @throws InternalServerErrorException if API connection fails
   */
  private getQueryStringParameters(obj: any) {
    return Object.keys(obj)
      .map((key) => key + '=' + obj[key])
      .join('&');
  }

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
      const url = `${this.intranetApiBaseUrl}/auth_ctrl/login`;

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

  /**
   * Make a request to the ChatGPT API
   * @param messages Array of messages to send to ChatGPT
   * @param model The model to use (defaults to gpt-4o-mini)
   * @param maxTokens Maximum tokens to generate (defaults to 500)
   * @param temperature Randomness of the output (defaults to 0.7)
   * @returns The generated content from ChatGPT
   * @throws HttpException if the API call fails
   */
  async callChatGptApi(
    messages: ChatGptMessage[],
    model: string = this.DEFAULT_GPT_MODEL,
    maxTokens: number = this.DEFAULT_MAX_TOKENS,
    temperature: number = this.DEFAULT_TEMPERATURE,
  ): Promise<string> {
    if (!this.chatGptUrl || !this.chatGptApiKey) {
      throw new HttpException(
        {
          success: false,
          message: 'ChatGPT API configuration missing',
          error: 'CONFIGURATION_ERROR',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const body: ChatGptRequestBody = {
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    };

    try {
      const response = await axios.post<ChatGptResponse>(
        `${this.chatGptUrl}/chat/completions`,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.chatGptApiKey}`,
          },
        },
      );

      if (
        !response.data ||
        !response.data.choices ||
        response.data.choices.length === 0
      ) {
        throw new HttpException(
          {
            success: false,
            message: 'Failed to generate content from ChatGPT',
            error: 'API_ERROR',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      return response.data.choices[0].message.content;
    } catch (error) {
      this.logger.error(`ChatGPT API error: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      if (axios.isAxiosError(error)) {
        throw new HttpException(
          {
            success: false,
            message: 'Failed to call ChatGPT API',
            error: error.message,
            details: error.response?.data,
          },
          HttpStatus.BAD_GATEWAY,
        );
      }
      throw new HttpException(
        {
          success: false,
          message: 'Unknown error while calling ChatGPT API',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
