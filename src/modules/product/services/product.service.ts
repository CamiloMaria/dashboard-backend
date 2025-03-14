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
import { ExternalApiService } from '../../../common/services/external-api.service';
import { ShopilamaProductResponse } from '../../../common/interfaces/shopilama-api.interface';
import {
  CreateProductResultDto,
  ProductCreationStatus,
} from '../dto/create-product.dto';
import { EnvService, LoggerService } from 'src/config';
import { CreateProductInstaleap } from 'src/common/interfaces';
import { WebProductGroup } from '../entities/shop/web-product-group.entity';

@Injectable()
export class ProductService {
  private readonly DEFAULT_STORE = 'PL09';

  constructor(
    @InjectRepository(WebProduct, DatabaseConnection.SHOP)
    private readonly webProductRepository: Repository<WebProduct>,
    @InjectRepository(WebProductGroup, DatabaseConnection.SHOP)
    private readonly webProductGroupRepository: Repository<WebProductGroup>,
    private readonly productMapper: ProductMapper,
    private readonly externalApiService: ExternalApiService,
    private readonly envService: EnvService,
    private readonly logger: LoggerService,
  ) {}

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
      const totalItems = await this.webProductRepository.count({
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
      const products = await this.webProductRepository.find({
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
      const products = await this.webProductRepository.find({
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
      const product = await this.webProductRepository.findOne({
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
      const prompt = `Tu trabajo ahora es ayúdarme a generar una descripción comercial para el siguiente producto: ${productTitle}. 
      Quiero que solo me respondas con el texto en formato html.`;

      const content = await this.externalApiService.callChatGptApi([
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ]);

      // Clean the response by removing markdown code blocks and newlines
      return content
        .replace(/```html\n/, '')
        .replace(/\n```/, '')
        .replace(/\n/g, '');
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
      const prompt = `Hola, estamos creando un e-commerce en 
      República Dominicana y necesitamos crear un listado de keywords 
      para cada producto de nuestro catalogo que contenga los regionalismos 
      clásicos del pais, ¿crees que puedas ayudarnos con la creación de estas 
      keywords? Para esta tarea, te voy a dar el nombre del producto y sus 
      categorias. Producto: ${productTitle} y las categorias a que pertenece 
      son estas: ${productCategory}. Necesito que solo me respondas con el 
      resultado sea una lista seperada por comma.`;

      const content = await this.externalApiService.callChatGptApi([
        { role: 'user', content: prompt },
      ]);

      // Just trim any extra whitespace
      return content.trim();
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

  /**
   * Create products from a list of SKUs
   * @param skus List of product SKUs to create
   * @param username Username of the user creating the products
   * @returns Results for each SKU processing
   */
  async createProductsFromSkus(
    skus: string[],
    username: string,
  ): Promise<CreateProductResultDto[]> {
    const results: CreateProductResultDto[] = [];

    // Process each SKU in sequence
    for (const sku of skus) {
      try {
        // Check if product already exists
        const existingProduct = await this.webProductRepository.findOne({
          where: { sku },
        });

        if (existingProduct) {
          results.push({
            sku,
            success: true,
            message: 'Product already exists',
            status: ProductCreationStatus.EXISTING,
          });
          continue; // Skip to next SKU
        }

        // Product doesn't exist, call the external API through the ExternalApiService
        const productData =
          await this.externalApiService.fetchProductDataFromShopilama(
            sku,
            this.DEFAULT_STORE,
          );

        // Check if the API returned an error
        if (productData.error) {
          results.push({
            sku,
            success: false,
            message: `Sku ${sku} No tiene determinación de precio para la tienda ${this.DEFAULT_STORE}`,
            status: ProductCreationStatus.NO_PRICE,
          });
          continue; // Skip to next SKU
        }

        // Create and save the new product
        const newProduct = await this.createProductFromShopilamaData(
          sku,
          productData,
          username,
        );

        if (!newProduct) {
          results.push({
            sku,
            success: false,
            message: 'Failed to create product',
            status: ProductCreationStatus.ERROR,
          });
          continue; // Skip to next SKU
        }

        // Get bigItems value from WebProductGroup
        let bigItems = 0;
        try {
          const productGroup = await this.webProductGroupRepository.findOne({
            where: { group_sap: newProduct.grupo },
          });

          if (productGroup) {
            bigItems = productGroup.bigItems;
          }
        } catch (groupError) {
          this.logger.error(
            `Error fetching product group for SKU ${sku}: ${groupError.message}`,
            groupError.stack,
          );
          // Continue with default bigItems value
        }

        // Create product in Instaleap
        const instaleapProduct: CreateProductInstaleap = {
          name: newProduct.title,
          photosUrl: [
            `${this.envService.baseCloudflareImg}/${this.envService.urlCloudflareSuffix}`,
          ],
          sku: newProduct.sku,
          unit: newProduct.unmanejo || 'UND',
          ean: [newProduct.sku],
          description: newProduct.description_instaleap,
          bigItems: bigItems,
          brand: newProduct.brand,
        };

        try {
          await this.externalApiService.createProductInstaleap(
            instaleapProduct,
          );
          this.logger.log(`Product ${sku} created successfully in Instaleap`);
        } catch (instaleapError) {
          this.logger.error(
            `Failed to create product ${sku} in Instaleap: ${instaleapError.message}`,
            instaleapError.stack,
          );
          // Continue with the process even if Instaleap creation fails
        }

        results.push({
          sku,
          success: true,
          message: `Product created successfully: ${newProduct.title}`,
          status: ProductCreationStatus.CREATED,
        });
      } catch (error) {
        this.logger.error(
          `Error creating product with SKU ${sku}: ${error.message}`,
          error.stack,
        );

        results.push({
          sku,
          success: false,
          message: `Failed to create product: ${error.message}`,
          status: ProductCreationStatus.ERROR,
        });
      }
    }

    return results;
  }

  /**
   * Create a new product from Shopilama API data
   * @param sku The product SKU
   * @param productData The product data from the Shopilama API
   * @param username Username of the user creating the product
   * @returns The created product entity
   */
  private async createProductFromShopilamaData(
    sku: string,
    productData: ShopilamaProductResponse,
    username: string,
  ): Promise<WebProduct> {
    try {
      // Create a new product entity with data from the API
      const newProduct = new WebProduct();
      newProduct.sku = sku;
      newProduct.matnr = productData.material;
      newProduct.title = productData.title;
      newProduct.depto = productData.depto;
      newProduct.grupo = productData.grupo;
      newProduct.unmanejo = productData.unmanejo;
      newProduct.tpean = productData.tpean;

      // Convert tipo_itbis directly to number for type_tax
      newProduct.type_tax = Number(productData.tipo_itbis) || 0;

      // Set user info
      newProduct.userAdd = username;
      newProduct.userUpd = username;

      // Set default values
      newProduct.borrado = false;
      newProduct.status_new = 0; // New article

      // Save the new product
      return await this.webProductRepository.save(newProduct);
    } catch (error) {
      this.logger.error(
        `Failed to create product from Shopilama data: ${error.message}`,
        error.stack,
      );

      throw new HttpException(
        {
          success: false,
          message: 'Failed to create product',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
