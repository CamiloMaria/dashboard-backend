import {
  Injectable,
  Logger,
  UnauthorizedException,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { EnvService } from '../../config/env/env.service';
import {
  ChatGptMessage,
  ChatGptRequestBody,
  ChatGptResponse,
  CreateProductInstaleap,
  ShopilamaProductResponse,
  UserLoginResponse,
  UpdateCatalogInstaleap,
  CreateCatalogInstaleap,
  UpdateProductInstaleap,
} from '../interfaces';
import { CloudflareResponse } from '../interfaces/cloudflare-api.interface';

@Injectable()
export class ExternalApiService {
  private readonly logger = new Logger(ExternalApiService.name);

  private readonly intranetApiBaseUrl: string;
  private readonly shopilamaApiBaseUrl: string;

  private readonly instaleapApiBaseUrl: string;
  private readonly instaleapApiKey: string;

  private readonly cloudflareBaseUrl: string;
  private readonly cloudflareAccountId: string;
  private readonly cloudflareApiToken: string;
  private readonly cloudflareImageDns: string;

  private readonly chatGptUrl: string;
  private readonly chatGptApiKey: string;
  private readonly DEFAULT_GPT_MODEL = 'gpt-4o-mini';
  private readonly DEFAULT_MAX_TOKENS = 500;
  private readonly DEFAULT_TEMPERATURE = 0.7;
  private readonly DEFAULT_STORE = 'PL09';

  constructor(
    private readonly httpService: HttpService,
    private readonly envService: EnvService,
  ) {
    this.intranetApiBaseUrl = this.envService.intranetApiBaseUrl;
    this.shopilamaApiBaseUrl = this.envService.shopilamaApiBaseUrl;
    this.chatGptUrl = this.envService.chatGptUrl;
    this.chatGptApiKey = this.envService.chatGptApiKey;
    this.instaleapApiBaseUrl = this.envService.instaleapApiBaseUrl;
    this.instaleapApiKey = this.envService.instaleapApiKey;
    this.cloudflareBaseUrl = this.envService.cloudflareBaseUrl;
    this.cloudflareAccountId = this.envService.cloudflareAccountId;
    this.cloudflareApiToken = this.envService.cloudflareApiToken;
    this.cloudflareImageDns = this.envService.cloudflareImageDns;
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
      const response = await firstValueFrom(
        this.httpService.post<ChatGptResponse>(
          `${this.chatGptUrl}/chat/completions`,
          body,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.chatGptApiKey}`,
            },
          },
        ),
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
      if (error.isAxiosError) {
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

  /**
   * Fetch product data from Shopilama API
   * @param sku The product SKU to fetch
   * @param store The store code (defaults to PL09)
   * @returns Product data from the API
   * @throws HttpException if the API call fails
   */
  async fetchProductDataFromShopilama(
    sku: string,
    store: string = this.DEFAULT_STORE,
  ): Promise<ShopilamaProductResponse> {
    try {
      const path = 'services/search/price';
      const url = `${this.shopilamaApiBaseUrl}/${path}`;

      const body = {
        url: path,
        ean: sku,
        tienda: store,
      };

      const response = await firstValueFrom(
        this.httpService.post<ShopilamaProductResponse>(url, body),
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch product data from Shopilama API for SKU ${sku}: ${error.message}`,
        error.stack,
      );

      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch product data from external API',
          error: error.message,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Create product in Instaleap
   * @param product The product data to create in Instaleap
   * @throws HttpException if the API call fails
   */
  async createProductInstaleap(
    product: CreateProductInstaleap,
  ): Promise<boolean> {
    try {
      const url = `${this.instaleapApiBaseUrl}/product/products`;

      const response = await firstValueFrom(
        this.httpService.post(url, product, {
          headers: {
            'x-api-key': this.instaleapApiKey,
          },
        }),
      );

      return response.status === 201;
    } catch (error) {
      // Skip 409 errors as they indicate the product is already up to date
      if (error.response?.status === 409) {
        return true;
      }

      this.logger.error(
        `Error creating product in Instaleap: ${error.message}`,
        error.stack,
      );

      throw new HttpException(
        {
          success: false,
          message: 'Failed to create product in Instaleap',
          error: error.message,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Update product in Instaleap
   * @param sku The product SKU to update
   * @param product The product data to update in Instaleap
   * @returns null if operation fails or has specific status codes, true if successful
   */
  async updateProductInstaleap(
    sku: string,
    product: UpdateProductInstaleap,
  ): Promise<boolean | null> {
    try {
      const url = `${this.instaleapApiBaseUrl}/product/products/sku/${sku}`;

      const response = await firstValueFrom(
        this.httpService.put(url, product, {
          headers: {
            'x-api-key': this.instaleapApiKey,
          },
        }),
      );

      return response.status === 200;
    } catch (error) {
      // Skip specific status codes
      if (error.response?.status === 409 || error.response?.status === 404) {
        return null;
      } else if (error.response?.status === 400) {
        // Try to create the product if update fails with 400
        await this.createProductInstaleap({
          sku,
          photosUrl: product.photosUrl,
          name: product.name,
          unit: product.unit,
          specifications: product.specifications,
          description: product.description,
          bigItems: product.bigItems,
          brand: product.brand,
        });
        return null;
      }

      this.logger.error(
        `Error updating product in Instaleap: ${error.message}`,
        error.stack,
      );

      throw new HttpException(
        {
          success: false,
          message: 'Failed to update product in Instaleap',
          error: error.message,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Create catalog in Instaleap
   * @param body The catalog data to create in Instaleap
   * @returns The response from Instaleap or null if the operation fails
   */
  async createCatalogInInstaleap(body: CreateCatalogInstaleap) {
    try {
      const url = `${this.instaleapApiBaseUrl}/catalog/catalogs`;

      const response = await firstValueFrom(
        this.httpService.post(url, body, {
          headers: {
            'x-api-key': this.instaleapApiKey,
          },
        }),
      );

      return response.status === 200;
    } catch (error) {
      // Skip 409 errors as they indicate the catalog is already up to date
      if (error.response?.status === 409) {
        return true;
      }

      this.logger.error(
        `Error creating catalog in Instaleap: ${error.message}`,
        error.stack,
      );

      return null;
    }
  }

  /**
   * Update catalog in Instaleap
   * @param params Parameters containing SKU and store reference
   * @param body The catalog data to update in Instaleap
   * @returns The response from Instaleap or null if the operation fails
   */
  async updateCatalogInInstaleap(
    params: { sku: string; storeReference: string },
    body: UpdateCatalogInstaleap,
  ) {
    try {
      const url = `${this.instaleapApiBaseUrl}/catalog/catalogs/sku/${params.sku}/storeReference/${params.storeReference}`;

      const response = await firstValueFrom(
        this.httpService.put(url, body, {
          headers: {
            'x-api-key': this.instaleapApiKey,
          },
        }),
      );

      return response.status === 200 || response.status === 204;
    } catch (error) {
      // Skip 409 errors as they indicate the catalog is already up to date
      if (error.response?.status === 409) {
        return true;
      }

      this.logger.error(
        `Error updating catalog in Instaleap: ${error.message}`,
        error.stack,
      );

      return null;
    }
  }

  /**
   * Upload an image to Cloudflare Images using batch API
   * @param file The file to upload
   * @param batchToken The Cloudflare batch token
   * @param metadata Optional metadata to attach to the image
   * @param requireSignedURLs Whether to require signed URLs for the image
   * @returns The response from Cloudflare Images API
   */
  async uploadBatchImageFromFile(
    file: Express.Multer.File,
    batchToken: string,
    metadata?: object,
    requireSignedURLs: boolean = false,
  ): Promise<CloudflareResponse> {
    const formData = new FormData();

    const blob = new Blob([file.buffer], { type: file.mimetype });
    formData.append('file', blob, file.originalname);

    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    formData.append('requireSignedURLs', requireSignedURLs.toString());
    try {
      const { data } = await lastValueFrom(
        this.httpService.post(
          `${this.cloudflareBaseUrl}/${this.cloudflareAccountId}/images/v1`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${batchToken}`,
              'Content-Type': 'multipart/form-data',
            },
          },
        ),
      );

      if (!data || data.success === false) {
        throw new HttpException(
          {
            success: false,
            message: 'Failed to upload image to Cloudflare',
            error: 'API_ERROR',
          },
          HttpStatus.BAD_GATEWAY,
        );
      }
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Deletes an image from Cloudflare Images
   * @param imageId The ID of the image to delete
   * @returns The response from Cloudflare Images API
   */
  async deleteImage(imageId: string): Promise<CloudflareResponse> {
    try {
      const { data } = await lastValueFrom(
        this.httpService.delete(
          `${this.cloudflareBaseUrl}/${this.cloudflareAccountId}/images/v1/${imageId}`,
          {
            headers: {
              Authorization: `Bearer ${this.cloudflareApiToken}`,
            },
          },
        ),
      );

      if (!data || data.success === false) {
        throw new HttpException(
          {
            success: false,
            message: 'Failed to delete image from Cloudflare',
            error: 'API_ERROR',
          },
          HttpStatus.BAD_GATEWAY,
        );
      }

      return data;
    } catch (error) {
      throw error;
    }
  }
}
