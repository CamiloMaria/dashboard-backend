import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Like, Repository } from 'typeorm';
import { WebProduct } from '../entities/shop/web-product.entity';
import { ProductResponseDto } from '../dto/product-response.dto';
import { DatabaseConnection } from '../../../config/database/constants';
import { ProductMapper } from '../mappers/product.mapper';
import { PaginationMeta } from '../../../config/swagger/response.schema';
import {
  ProductFilterDto,
  SortField,
  SortOrder,
} from '../dto/product-filter.dto';
import axios from 'axios';
import { EnvService } from 'src/config';

@Injectable()
export class ProductService {
  private readonly chatGptUrl: string;
  private readonly chatGptApiKey: string;

  constructor(
    @InjectRepository(WebProduct, DatabaseConnection.SHOP)
    private readonly productRepository: Repository<WebProduct>,
    private readonly productMapper: ProductMapper,
    private readonly envService: EnvService,
  ) {
    this.chatGptUrl = this.envService.chatGptUrl;
    this.chatGptApiKey = this.envService.chatGptApiKey;
  }

  /**
   * Fetch products with pagination and search filters
   * @param filterDto Filter and pagination parameters
   * @returns Array of products with related data and pagination metadata
   */
  async findAllPaginated(
    filterDto: ProductFilterDto,
  ): Promise<{ items: ProductResponseDto[]; meta: PaginationMeta }> {
    try {
      const {
        page = 1,
        limit = 10,
        sku,
        title,
        matnr,
        sortBy = SortField.TITLE,
        sortOrder = SortOrder.ASC,
      } = filterDto;

      // Ensure valid pagination parameters
      const validPage = page > 0 ? page : 1;
      const validLimit = limit > 0 ? limit : 10;

      // Calculate offset
      const offset = (validPage - 1) * validLimit;

      // Build where conditions for search
      const whereConditions: FindOptionsWhere<WebProduct> = {};

      // Add search filters if provided
      if (sku) {
        whereConditions.sku = sku;
      }

      if (title) {
        whereConditions.title = Like(`%${title}%`);
      }

      if (matnr) {
        whereConditions.matnr = matnr;
      }

      // Get total count of active products matching the search criteria
      const totalItems = await this.productRepository.count({
        where: whereConditions,
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalItems / validLimit);

      // Prepare the order options for sorting
      const orderOptions: { [key: string]: 'ASC' | 'DESC' } = {};
      if (sortBy) {
        orderOptions[sortBy] = sortOrder;
      }

      // Find products matching the search criteria with pagination
      const products = await this.productRepository.find({
        where: whereConditions,
        relations: ['images', 'catalogs'],
        skip: offset,
        take: validLimit,
        order: Object.keys(orderOptions).length > 0 ? orderOptions : undefined,
      });

      if (!products || products.length === 0) {
        throw new HttpException(
          {
            success: false,
            message: 'No products found matching your search criteria',
            error: 'NOT_FOUND',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      // Map database entities to response DTOs
      const items = await Promise.all(
        products.map((product) => this.productMapper.mapToDto(product)),
      );

      // Create pagination metadata
      const meta: PaginationMeta = {
        currentPage: validPage,
        itemsPerPage: validLimit,
        totalItems,
        totalPages,
      };

      return { items, meta };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve products',
          error: error.message,
          meta: { details: error.stack },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Fetch all products with their related images and inventory
   * @returns Array of products with related data
   */
  async findAll(): Promise<ProductResponseDto[]> {
    try {
      // Find all active products with their related images and catalogs
      const products = await this.productRepository.find({
        where: { borrado: false },
        relations: ['images', 'catalogs'],
        take: 10,
      });

      if (!products || products.length === 0) {
        throw new HttpException(
          {
            success: false,
            message: 'No products found',
            error: 'NOT_FOUND',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      // Map database entities to response DTOs
      return Promise.all(
        products.map((product) => this.productMapper.mapToDto(product)),
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve products',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find a product by its ID
   * @param id The product ID
   * @returns Product with related data
   */
  async findById(id: number): Promise<ProductResponseDto> {
    try {
      const product = await this.productRepository.findOne({
        where: { num: id },
        relations: ['images', 'catalogs'],
      });

      if (!product) {
        throw new HttpException(
          {
            success: false,
            message: `Product with ID ${id} not found`,
            error: 'NOT_FOUND',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return this.productMapper.mapToDto(product);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: `Failed to retrieve product with ID ${id}`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate a product description using ChatGPT
   * @param productTitle The title of the product
   * @returns Generated HTML description
   */
  async generateDescription(productTitle: string): Promise<string> {
    try {
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

      const body = {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          {
            role: 'user',
            content: `Tu trabajo ahora es ayúdarme a generar una descripción comercial para el siguiente producto: ${productTitle}. 
            Quiero que solo me respondas con el texto en formato html.`,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      };

      const response = await axios.post(
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
            message: 'Failed to generate description',
            error: 'API_ERROR',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Extract the generated description from the response
      const generatedDescription = response.data.choices[0].message.content;

      // Clean the response by removing markdown code blocks and newlines
      const cleanedDescription = generatedDescription
        .replace(/```html\n/, '')
        .replace(/\n```/, '')
        .replace(/\n/g, '');

      return cleanedDescription;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to generate product description',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate SEO keywords for a product using ChatGPT
   * @param productTitle The title of the product
   * @param productCategory The category of the product
   * @returns Comma-separated list of SEO keywords
   */
  async generateKeywords(
    productTitle: string,
    productCategory: string,
  ): Promise<string> {
    try {
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

      const body = {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `Hola, estamos creando un e-commerce en 
                República Dominicana y necesitamos crear un listado de keywords 
                para cada producto de nuestro catalogo que contenga los regionalismos 
                clásicos del pais, ¿crees que puedas ayudarnos con la creación de estas 
                keywords? Para esta tarea, te voy a dar el nombre del producto y sus 
                categorias. Producto: ${productTitle} y las categorias a que pertenece 
                son estas: ${productCategory}. Necesito que solo me respondas con el 
                resultado sea una lista seperada por comma.`,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      };

      const response = await axios.post(
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
            message: 'Failed to generate keywords',
            error: 'API_ERROR',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Extract the generated keywords from the response and clean them
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to generate product keywords',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
