import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Like, Repository } from 'typeorm';
import { WebProduct } from '../entities/shop/web-product.entity';
import {
  ProductResponseDto,
  SpecificationResponseDto,
} from '../dto/product-response.dto';
import { DatabaseConnection } from '../../../config/database/constants';
import { ProductMapper } from '../mappers/product.mapper';
import { PaginationMeta } from '../../../common/schemas/response.schema';
import {
  ProductFilterDto,
  ProductStatus,
  SortField,
  SortOrder,
} from '../dto/product-filter.dto';
import { ExternalApiService } from '../../../common/services/external-api.service';
import { ShopilamaProductResponse } from '../../../common/interfaces/shopilama-api.interface';
import {
  CreateProductResultDto,
  ProductCreationStatus,
} from '../dto/create-product.dto';
import { LoggerService } from 'src/config';
import { GenerateKeywordsDto } from '../dto/generate-keywords.dto';
import {
  CatalogUpdateDto,
  ProductPatchDto,
  ProductUpdateDto,
} from '../dto/product-update.dto';
import { WebCatalog } from '../entities/shop/web-catalog.entity';
import { WebProductRemoved } from '../entities/shop/web-product-removed.entity';
import { WebProductImage } from '../entities/shop/web-product-image.entity';
import { DataSource } from 'typeorm';
import { ModuleRef } from '@nestjs/core';
import { ProductImageService } from './product-image.service';
import { EnvService } from 'src/config/env/env.service';
import { InstaleapMapper, tryParseJson } from 'src/common';
import { UserLogsService } from 'src/common/services/user-logs.service';

@Injectable()
export class ProductService {
  private readonly DEFAULT_STORE = 'PL09';
  // Track the status of the keyword generation task
  private keywordGenerationStatus: {
    isRunning: boolean;
    startTime: Date;
    endTime?: Date;
    totalProducts: number;
    processedProducts: number;
    successCount: number;
    failedCount: number;
    lastProcessedSku?: string;
    batchSize: number;
    concurrencyLevel?: number;
    performanceStats?: {
      apiResponseTimes: number[];
      averageResponseTime: number;
      consecutiveErrors: number;
      lastErrorTime?: Date;
      adaptiveDelayMs: number;
    };
  } | null = null;

  // In-progress processing tasks
  private pendingKeywordTasks: Map<string, Promise<string[]>> = new Map();

  // Flag to request pause
  private pauseRequested = false;
  private readonly imageDefaultUrl: string;
  private readonly imageDNS: string;

  constructor(
    @InjectRepository(WebProduct, DatabaseConnection.SHOP)
    private readonly webProductRepository: Repository<WebProduct>,
    @InjectRepository(WebCatalog, DatabaseConnection.SHOP)
    private readonly webCatalogRepository: Repository<WebCatalog>,
    @InjectRepository(WebProductImage, DatabaseConnection.SHOP)
    private readonly webProductImageRepository: Repository<WebProductImage>,
    @InjectRepository(WebProductRemoved, DatabaseConnection.SHOP)
    private readonly webProductRemovedRepository: Repository<WebProductRemoved>,
    @InjectDataSource(DatabaseConnection.SHOP)
    private readonly dataSource: DataSource,
    private readonly logger: LoggerService,
    private readonly productMapper: ProductMapper,
    private readonly instaleapMapper: InstaleapMapper,
    private readonly externalApiService: ExternalApiService,
    private readonly moduleRef: ModuleRef,
    private readonly envService: EnvService,
    private readonly userLogsService: UserLogsService,
  ) {
    this.imageDefaultUrl = this.envService.cloudflareDefaultImageUrl;
    this.imageDNS = this.envService.cloudflareImageDns;
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
        status,
        bigItem,
        search,
        sortBy = SortField.TITLE,
        sortOrder = SortOrder.ASC,
      } = filterDto;

      // Ensure valid pagination parameters
      const validPage = page > 0 ? page : 1;
      const validLimit = limit > 0 ? limit : 10;

      // Calculate offset
      const offset = (validPage - 1) * validLimit;

      // Build where conditions for search
      let whereConditions:
        | FindOptionsWhere<WebProduct>
        | FindOptionsWhere<WebProduct>[] = {};

      // If unified search term is provided, create OR conditions for multiple fields
      if (search) {
        whereConditions = [
          { title: Like(`%${search}%`) },
          { sku: Like(`%${search}%`) },
          { matnr: Like(`%${search}%`) },
        ];
      } else {
        // Add individual search filters if provided
        if (sku) {
          whereConditions =
            typeof whereConditions === 'object' ? whereConditions : {};
          whereConditions.sku = Like(`%${sku}%`);
        }

        if (status) {
          whereConditions =
            typeof whereConditions === 'object' ? whereConditions : {};
          whereConditions.borrado = status !== ProductStatus.ACTIVE;
        }

        if (bigItem) {
          whereConditions =
            typeof whereConditions === 'object' ? whereConditions : {};
          whereConditions.group = {
            bigItems: bigItem ? 1 : 0,
          };
        }
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
        relations: ['images', 'catalogs', 'group'],
        skip: offset,
        take: validLimit,
        order: Object.keys(orderOptions).length > 0 ? orderOptions : undefined,
      });

      // if (!products || products.length === 0) {
      //   throw new HttpException(
      //     {
      //       success: false,
      //       message: 'No products found matching your search criteria',
      //       error: 'NOT_FOUND',
      //     },
      //     HttpStatus.NOT_FOUND,
      //   );
      // }

      // Map database entities to response DTOs
      const items = products.map((product) =>
        this.productMapper.mapToDto(product),
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
   * Fetch all products with their related images and catalogs
   * @returns Array of products with related data
   */
  async findAll(): Promise<ProductResponseDto[]> {
    try {
      // Find all active products with their related images and catalogs
      const products = await this.webProductRepository.find({
        where: { borrado: false },
        relations: ['images', 'catalogs', 'group'],
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
        relations: ['images', 'catalogs', 'group'],
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
      const prompt = `Hola, estamos creando un e-commerce en 
      República Dominicana y necesitamos crear una descripción comercial
      para cada producto de nuestro catalogo que contenga los regionalismos 
      clásicos del pais. Para esta tarea, te voy a dar el titulo del producto.
      Tu trabajo ahora es ayúdarme a generar una descripción comercial 
      para el siguiente producto: ${productTitle}. 
      Quiero que solo me respondas con el texto en formato html y agreaga unicamente &nbsp; antes de cada etiquita de abrir <h3>. Debe tener este formato:
      <p>Descripción breve del producto</p>
      <h3>Características del producto</h3>
      <ul>
          <li>Característica 1</li>
          <li>Característica 2</li>
          <li>Característica 3</li>
          <li>etc...</li>
      </ul>
      <h3>Perfecto para Disfrutar:</h3>
      <p>Descripción breve</p>
      <h3>¿Por qué elegir ${productTitle}?</h3>
      <p>Descripción breve</p>
      `;

      const content = await this.externalApiService.callChatGptApi([
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt.trim() },
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
   * Track API response times and update adaptive delay
   * @param responseTimeMs Time it took to get a response from the API
   * @param isError Whether the request resulted in an error
   */
  private updateApiPerformanceStats(
    responseTimeMs: number,
    isError: boolean,
  ): void {
    if (!this.keywordGenerationStatus?.isRunning) return;

    // Initialize performance stats if not already done
    if (!this.keywordGenerationStatus.performanceStats) {
      this.keywordGenerationStatus.performanceStats = {
        apiResponseTimes: [],
        averageResponseTime: 0,
        consecutiveErrors: 0,
        adaptiveDelayMs: 500, // Start with a moderate delay
      };
    }

    const stats = this.keywordGenerationStatus.performanceStats;

    // Track response time
    stats.apiResponseTimes.push(responseTimeMs);

    // Keep only the last 20 response times for calculating the average
    if (stats.apiResponseTimes.length > 20) {
      stats.apiResponseTimes.shift();
    }

    // Calculate average response time
    stats.averageResponseTime =
      stats.apiResponseTimes.reduce((sum, time) => sum + time, 0) /
      stats.apiResponseTimes.length;

    // Update consecutive errors count
    if (isError) {
      stats.consecutiveErrors++;
      stats.lastErrorTime = new Date();

      // Implement exponential backoff for delays when errors occur
      stats.adaptiveDelayMs = Math.min(
        stats.adaptiveDelayMs * 2,
        30000, // Max 30 seconds delay
      );
    } else {
      stats.consecutiveErrors = 0;

      // Gradually reduce delay if successful
      if (stats.adaptiveDelayMs > 500) {
        stats.adaptiveDelayMs = Math.max(
          stats.adaptiveDelayMs * 0.8,
          500, // Min 500ms delay
        );
      }
    }
  }

  /**
   * Get the appropriate delay between API calls based on performance
   * @returns Delay in milliseconds
   */
  private getAdaptiveDelay(): number {
    const stats = this.keywordGenerationStatus?.performanceStats;

    if (!stats) return 1000; // Default delay

    // If there have been recent consecutive errors, use the adaptive delay
    if (stats.consecutiveErrors > 0) {
      return stats.adaptiveDelayMs;
    }

    // Otherwise, calculate a delay based on the average response time
    // Aim for a reasonable throughput without overwhelming the API
    return Math.max(500, Math.min(stats.averageResponseTime * 0.5, 5000));
  }

  /**
   * Generate keywords for a product using ChatGPT with performance tracking
   * @param generateDto The data to use for generation
   * @returns Array of keywords
   */
  async generateKeywords(generateDto: GenerateKeywordsDto): Promise<string[]> {
    const startTime = Date.now();

    try {
      const { sku } = generateDto;

      // Get product matnr from sku
      const product = await this.webProductRepository.findOne({
        select: {
          num: true,
          title: true,
          matnr: true,
          grupo: true,
          group: {
            cat_app: true,
          },
        },
        where: { sku },
        relations: ['group'],
      });

      if (!product) {
        throw new HttpException(
          {
            success: false,
            message: 'Product not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      if (!product.group) {
        throw new HttpException(
          {
            success: false,
            message: 'Product category not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const prompt = `Hola, estamos creando un e-commerce en 
      República Dominicana y necesitamos crear un listado de keywords 
      para cada producto de nuestro catalogo que contenga los regionalismos 
      clásicos del pais, ¿crees que puedas ayudarnos con la creación de estas 
      keywords? Para esta tarea, te voy a dar el nombre del producto y sus 
      categorias. Producto: ${product.title} y las categorias a que pertenece 
      son estas: ${product.group.cat_app}. Necesito que solo me respondas con el 
      resultado sea una lista seperada por comma.`;

      const content = await this.externalApiService.callChatGptApi([
        { role: 'user', content: prompt },
      ]);

      // Just trim any extra whitespace
      const keywords = content.split(',').map((keyword) => keyword.trim());

      // Add matnr to keywords
      const result = [product.matnr, ...keywords];

      // Update performance stats
      this.updateApiPerformanceStats(Date.now() - startTime, false);

      return result;
    } catch (error) {
      // Update performance stats with error
      this.updateApiPerformanceStats(Date.now() - startTime, true);

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

    // Create new set to remove duplicates
    const uniqueSkus = [...new Set(skus)];

    // Process each SKU in sequence
    for (const sku of uniqueSkus) {
      try {
        // Check if product already exists
        const existingProduct = await this.webProductRepository.findOne({
          where: { sku },
        });

        if (existingProduct) {
          results.push({
            sku,
            product: existingProduct,
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

        results.push({
          sku,
          product: newProduct,
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

    // Create success products in Instaleap
    // Filter out products that already exist and are new
    const successProducts = results.filter(
      (result) =>
        result.success && result.status === ProductCreationStatus.CREATED,
    );
    if (successProducts.length > 0) {
      // Process products in batches of 1000
      for (let i = 0; i < successProducts.length; i += 1000) {
        const batchProducts = successProducts.slice(i, i + 1000);
        const batchNumber = Math.floor(i / 1000) + 1;
        const totalBatches = Math.ceil(successProducts.length / 1000);

        this.logger.log(
          `Processing batch ${batchNumber}/${totalBatches} with ${batchProducts.length} SKUs`,
          ProductService.name,
        );

        await this.externalApiService.createProductInstaleapBatch({
          products: batchProducts.map(({ product, sku }) => ({
            sku,
            name: product.title,
            photosUrl:
              product.images && product.images.length > 0
                ? product.images.map((image) => `${image.src_cloudflare}/base`)
                : [this.imageDefaultUrl],
            unit: product.unmanejo,
            description: product.description_instaleap,
            brand: product.brand,
            searchKeywords: product.search_keywords,
          })),
        });

        this.logger.log(
          `Successfully created batch ${batchNumber}/${totalBatches} with ${batchProducts.length} products`,
          ProductService.name,
        );

        // Add delay between batches if not the last batch
        if (i + 1000 < successProducts.length) {
          this.logger.debug(
            `Waiting ${30} seconds before processing next batch`,
            ProductService.name,
          );
          await new Promise((resolve) => setTimeout(resolve, 30000));
        }
      }
    }

    // Log the create products request
    await this.userLogsService.logCreate(
      username,
      'create-products',
      `Products created from SKUs: ${skus.join(', ')}`,
      { results },
    );

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

  /**
   * Update a product and/or its catalogs
   * @param productId The ID of the product to update
   * @param updateDto The data to update
   * @param username The username of the user making the update
   * @returns The updated product
   */
  async updateProduct(
    productId: number,
    updateDto: ProductPatchDto,
    username: string,
  ): Promise<ProductResponseDto> {
    try {
      // Find the product with its catalogs
      const product = await this.webProductRepository.findOne({
        where: { num: productId },
        relations: ['images', 'catalogs', 'group'],
      });

      if (!product) {
        throw new HttpException(
          {
            success: false,
            message: `Product with ID ${productId} not found`,
            error: 'NOT_FOUND',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      // Update product fields if provided
      if (updateDto.product) {
        const {
          title,
          description_instaleap,
          specifications,
          search_keywords,
          security_stock,
          click_multiplier,
          borrado,
          borrado_comment,
        } = updateDto.product;

        const parsedSpecifications = tryParseJson<SpecificationResponseDto[]>(
          specifications,
          [],
        );
        const parsedSearchKeywords = tryParseJson<string[]>(
          search_keywords,
          [],
        );

        // Update fields only if they are provided
        if (title !== undefined) product.title = title;
        if (description_instaleap !== undefined)
          product.description_instaleap = description_instaleap;
        if (parsedSpecifications !== undefined) {
          if (parsedSpecifications.length > 0) {
            product.specifications = JSON.stringify(parsedSpecifications);
          } else {
            product.specifications = null;
          }
        }
        if (parsedSearchKeywords !== undefined) {
          if (parsedSearchKeywords.length > 0) {
            product.search_keywords = JSON.stringify(parsedSearchKeywords);
          } else {
            product.search_keywords = null;
          }
        }
        if (security_stock !== undefined)
          product.security_stock = security_stock;
        if (click_multiplier !== undefined)
          product.click_multiplier = click_multiplier;
        if (borrado !== undefined) product.borrado = borrado;
        if (borrado_comment !== undefined)
          product.borrado_comment = borrado_comment;

        // Set the user who updated the product
        product.userUpd = username;

        // Save the updated product
        await this.webProductRepository.save(product);

        // If product was updated in Instaleap, update it there as well
        if (
          title !== undefined ||
          description_instaleap !== undefined ||
          parsedSpecifications !== undefined ||
          parsedSearchKeywords !== undefined
        ) {
          try {
            await this.externalApiService.updateProductInstaleap(product.sku, {
              name: title,
              description: description_instaleap,
              specifications:
                this.instaleapMapper.mapSpecifications(parsedSpecifications),
              searchKeywords:
                this.instaleapMapper.mapSearchKeywords(parsedSearchKeywords),
            });
          } catch (instaleapError) {
            this.logger.error(
              `Failed to update product ${product.sku} in Instaleap: ${instaleapError.message}`,
              instaleapError.stack,
            );
            // Continue with the process even if Instaleap update fails
          }
        }
      }

      // Update catalogs if provided
      if (updateDto.catalogs && updateDto.catalogs.length > 0) {
        for (const catalogUpdate of updateDto.catalogs) {
          const catalog = await this.webCatalogRepository.findOne({
            where: { id: catalogUpdate.id },
          });

          if (!catalog) {
            this.logger.warn(
              `Catalog with ID ${catalogUpdate.id} not found during product update`,
            );
            continue;
          }

          // Update status if provided
          if (catalogUpdate.status !== undefined) {
            catalog.status = catalogUpdate.status;

            // Set status changed timestamp
            catalog.status_changed_at = new Date();

            // Set status changed by user
            catalog.status_changed_by = username;

            // Set manual override if status is being updated
            catalog.manual_override = true;

            // If status is 1, set status_comment to null
            if (catalogUpdate.status === 1) {
              catalog.status_comment = null;
            }
          }

          // Update status comment if provided and status is not 1
          if (
            catalogUpdate.status !== 1 &&
            catalogUpdate.status_comment !== undefined &&
            catalogUpdate.status_comment !== null &&
            catalogUpdate.status_comment !== ''
          ) {
            catalog.status_comment = catalogUpdate.status_comment;
          }

          // Update manual override if explicitly provided
          if (catalogUpdate.manual_override !== undefined) {
            catalog.manual_override = catalogUpdate.manual_override;
          }

          // Save the updated catalog
          await this.webCatalogRepository.save(catalog);
        }
      }

      // Update catalogs in Instaleap
      this.externalApiService.updateCatalogsBySkus([product.sku]);

      // Reload the product with its updated relations
      const updatedProduct = await this.webProductRepository.findOne({
        where: { num: productId },
        relations: ['images', 'catalogs', 'group'],
      });

      // Log the update product request
      await this.userLogsService.logUpdate(
        username,
        'update-product',
        `Product updated: ${productId}`,
        {
          before: product,
          after: updatedProduct,
        },
      );

      return this.productMapper.mapToDto(updatedProduct);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Failed to update product with ID ${productId}: ${error.message}`,
        error.stack,
      );

      throw new HttpException(
        {
          success: false,
          message: `Failed to update product with ID ${productId}`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete a product and its related data
   * @param productId The ID of the product to delete
   * @param comment Optional comment for deletion reason
   * @param username The username of the user performing the deletion
   * @returns Object with success status and message
   */
  async deleteProduct(
    productId: number,
    comment: string,
    username: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Start a transaction to ensure all operations succeed or fail together
      const queryRunner =
        this.webProductRepository.manager.connection.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Find the product with its relationships
        const product = await this.webProductRepository.findOne({
          where: { num: productId },
          relations: ['catalogs', 'images', 'group'],
        });

        if (!product) {
          throw new HttpException(
            {
              success: false,
              message: `Product with ID ${productId} not found`,
              error: 'NOT_FOUND',
            },
            HttpStatus.NOT_FOUND,
          );
        }

        // Create a backup in web_products_removed
        const removedProduct = new WebProductRemoved();
        removedProduct.sku = product.sku;
        removedProduct.text = JSON.stringify(product);
        removedProduct.user = username;
        removedProduct.comment = comment;

        await this.webProductRemovedRepository.save(removedProduct);

        // Delete catalogs
        if (product.catalogs && product.catalogs.length > 0) {
          // Update all catalogs in Instaleap to inactive
          for (const catalog of product.catalogs) {
            try {
              await this.externalApiService.updateCatalogInInstaleap(
                {
                  sku: catalog.sku,
                  storeReference: catalog.pl,
                },
                {
                  isActive: false,
                },
              );
            } catch (error) {
              // Log error but continue with deletion
              this.logger.error(
                `Failed to deactivate catalog ${catalog.sku}/${catalog.pl} in Instaleap: ${error.message}`,
                error.stack,
              );
            }
          }

          // Delete all catalogs in the database
          await this.webCatalogRepository.delete({ sku: product.sku });
        }

        // Delete product images
        if (product.images && product.images.length > 0) {
          await this.webProductImageRepository.delete({
            product_id: product.num,
          });
        }

        // Delete the product from Instaleap
        try {
          // There's no direct "isActive" field in UpdateProductInstaleap
          // But we can update it with minimal information to indicate it's no longer active
          // We'll set searchKeywords to indicate deletion
          await this.externalApiService.updateProductInstaleap(product.sku, {
            name: `[DELETED] ${product.title}`,
            searchKeywords: 'deleted,removed,inactive',
            boost: 9999,
          });
        } catch (error) {
          // Log error but continue with deletion
          this.logger.error(
            `Failed to deactivate product ${product.sku} in Instaleap: ${error.message}`,
            error.stack,
          );
        }

        // Delete the product from the database
        await this.webProductRepository.delete({ num: productId });

        // Commit the transaction
        await queryRunner.commitTransaction();

        // Log the delete product request
        await this.userLogsService.logDelete(
          username,
          'delete-product',
          `Product deleted: ${productId}`,
          {
            sku: product.sku,
            comment,
          },
        );

        return {
          success: true,
          message: `Product ${product.sku} deleted successfully`,
        };
      } catch (error) {
        // Rollback the transaction if anything fails
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        // Release the query runner
        await queryRunner.release();
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Failed to delete product with ID ${productId}: ${error.message}`,
        error.stack,
      );

      throw new HttpException(
        {
          success: false,
          message: `Failed to delete product with ID ${productId}`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Process atomic product update with multiple operations in a single transaction
   * @param sku The SKU of the product to update
   * @param updateData The update data containing product metadata and image operations
   * @param username The username performing the update
   * @returns The updated product with operation results
   */
  async atomicProductUpdate(
    sku: string,
    updateData: {
      product?: ProductUpdateDto;
      catalogs?: CatalogUpdateDto[];
      images?: {
        delete?: number[];
        add?: { position: number; file: Express.Multer.File }[];
        reorder?: { currentPosition: number; newPosition: number }[];
      };
    },
    username: string,
  ): Promise<{
    product?: ProductResponseDto;
    operations: {
      deletedImages?: {
        success: boolean;
        count: number;
        failedPositions?: number[];
      };
      addedImages?: {
        success: boolean;
        count: number;
        failedPositions?: number[];
      };
      reorderedImages?: { success: boolean; count: number };
      productUpdate?: { success: boolean };
    };
  }> {
    this.logger.log(
      `Starting atomic product update for product SKU ${sku} by ${username}`,
    );

    // Start a database transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find the product first to make sure it exists
      const product = await this.webProductRepository.findOne({
        where: { sku },
        relations: ['images'],
      });

      if (!product) {
        throw new HttpException(
          {
            success: false,
            message: `Product with SKU ${sku} not found`,
            error: 'NOT_FOUND',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      this.logger.log(
        `Processing atomic update for product ${product.sku} (ID: ${product.num})`,
      );

      // Initialize results object
      const operationResults = {
        deletedImages: undefined,
        addedImages: undefined,
        reorderedImages: undefined,
        productUpdate: undefined,
      };

      const productImageService = this.moduleRef.get(ProductImageService, {
        strict: false,
      });

      // 1. Process image deletions first
      if (updateData.images?.delete?.length) {
        this.logger.log(`Deleting ${updateData.images.delete.length} images`);

        try {
          const deleteResult = await productImageService.deleteProductImages(
            product.sku,
            updateData.images.delete,
            username,
          );

          operationResults.deletedImages = {
            success: deleteResult.success,
            count: deleteResult.deletedCount,
            failedPositions: deleteResult.failedPositions,
          };
        } catch (error) {
          this.logger.error(
            `Error deleting images: ${error.message}`,
            error.stack,
          );

          operationResults.deletedImages = {
            success: false,
            count: 0,
            failedPositions: updateData.images.delete,
          };

          // Don't throw here, continue with other operations
        }
      }

      // 2. Process new image uploads
      if (updateData.images?.add?.length) {
        this.logger.log(`Adding ${updateData.images.add.length} new images`);

        /**
         * Auto-positioning strategy for images without position information:
         * 1. Find the highest position number among existing images
         * 2. For each image without a position, assign position = (highest + n) where n starts at 1
         * 3. Validate that there are no conflicts between:
         *    - New images and other new images (duplicate positions)
         *    - New images and existing images that aren't being deleted
         * 4. Process uploads with the assigned positions
         */

        // Determine the next available position for any images that don't have a position
        let nextPosition = 1;

        // Create a set of existing positions
        const existingPositions = new Set<number>();
        if (product.images && product.images.length > 0) {
          product.images.forEach((img) => existingPositions.add(img.position));
          nextPosition =
            Math.max(...product.images.map((img) => img.position)) + 1;
        }

        this.logger.log(
          `Next available position for images without position: ${nextPosition}`,
        );

        // Handle files without positions
        const filesToUpload = updateData.images.add.map((item) => {
          if (item.position === null) {
            this.logger.log(
              `Auto-assigning position ${nextPosition} to file ${item.file.originalname}`,
            );
            const result = {
              position: nextPosition,
              file: item.file,
            };
            nextPosition++;
            return result;
          }
          return item;
        });

        // Check for duplicate positions among uploaded files
        const positionMap = new Map<number, string>();
        const hasDuplicates = filesToUpload.some((item) => {
          if (positionMap.has(item.position)) {
            this.logger.warn(
              `Duplicate position ${item.position} detected for files: ${positionMap.get(item.position)} and ${item.file.originalname}`,
            );
            return true;
          }
          positionMap.set(item.position, item.file.originalname);
          return false;
        });

        // Check for conflicts with existing images
        const conflictsWithExisting = filesToUpload.some((item) => {
          // Skip if this position is going to be deleted
          if (updateData.images?.delete?.includes(item.position)) {
            return false;
          }

          // Check if position exists but isn't being deleted
          if (existingPositions.has(item.position)) {
            this.logger.warn(
              `Position ${item.position} from file ${item.file.originalname} conflicts with an existing image position that isn't being deleted`,
            );
            return true;
          }
          return false;
        });

        if (hasDuplicates) {
          this.logger.error(
            `Cannot proceed with upload due to duplicate positions. Resubmit with unique positions or without specifying positions to auto-assign.`,
          );
          throw new HttpException(
            {
              success: false,
              message: 'Duplicate image positions detected',
              error: 'DUPLICATE_POSITIONS',
            },
            HttpStatus.BAD_REQUEST,
          );
        }

        if (conflictsWithExisting) {
          this.logger.error(
            `Cannot proceed with upload due to conflicts with existing image positions. Delete the existing image at the conflicting position first, or use a different position.`,
          );
          throw new HttpException(
            {
              success: false,
              message: 'Image position conflicts with existing images',
              error: 'POSITION_CONFLICT',
            },
            HttpStatus.BAD_REQUEST,
          );
        }

        const addResults = {
          success: true,
          count: 0,
          failedPositions: [],
        };

        for (const add of filesToUpload) {
          try {
            // Prepare the file for processing
            // Add position to filename for easier identification
            const originalName = add.file.originalname;
            const positionPrefix = `position_${add.position}_`;

            if (!originalName.startsWith(positionPrefix)) {
              add.file.originalname = `${positionPrefix}${sku}`;
            }

            // Process and upload the image
            const result = await productImageService.processAndUploadImage(
              add.file,
              sku,
              add.position,
              username,
            );

            if (result.success) {
              addResults.count++;
            } else {
              addResults.failedPositions.push(add.position);
              addResults.success = false;
            }
          } catch (error) {
            this.logger.error(
              `Error adding image at position ${add.position}: ${error.message}`,
              error.stack,
            );
            addResults.failedPositions.push(add.position);
            addResults.success = false;
          }
        }

        operationResults.addedImages = {
          success: addResults.success,
          count: addResults.count,
          failedPositions:
            addResults.failedPositions.length > 0
              ? addResults.failedPositions
              : undefined,
        };
      }

      // 3. Process image reordering
      if (updateData.images?.reorder?.length) {
        this.logger.log(
          `Reordering ${updateData.images.reorder.length} images`,
        );

        try {
          const reorderResult = await productImageService.reorderProductImages(
            product.sku,
            updateData.images.reorder,
            username,
          );

          operationResults.reorderedImages = {
            success: reorderResult.success,
            count: reorderResult.reorderedPositions.length,
          };
        } catch (error) {
          this.logger.error(
            `Error reordering images: ${error.message}`,
            error.stack,
          );

          operationResults.reorderedImages = {
            success: false,
            count: 0,
          };
        }
      }

      // 4. Process product metadata updates
      if (updateData.product) {
        this.logger.log(`Updating product metadata`);

        try {
          await this.updateProduct(
            product.num,
            {
              product: updateData.product,
              catalogs: updateData.catalogs,
            },
            username,
          );

          operationResults.productUpdate = { success: true };
        } catch (error) {
          this.logger.error(
            `Error updating product metadata: ${error.message}`,
            error.stack,
          );

          operationResults.productUpdate = { success: false };
        }
      }

      // Check if any operation succeeded
      const anyOperationSucceeded = Object.values(operationResults).some(
        (result) => result && result.success === true,
      );

      // If all operations failed, rollback and throw error
      if (!anyOperationSucceeded) {
        await queryRunner.rollbackTransaction();

        throw new HttpException(
          {
            success: false,
            message: 'All atomic update operations failed',
            operations: operationResults,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Commit the transaction
      await queryRunner.commitTransaction();

      // Fetch the updated product to return
      const updatedProduct = await this.findById(product.num);

      return {
        product: updatedProduct,
        operations: operationResults,
      };
    } catch (error) {
      // Rollback the transaction on error
      await queryRunner.rollbackTransaction();

      this.logger.error(
        `Error performing atomic product update: ${error.message}`,
        error.stack,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: `Failed to update product: ${error.message}`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }

  /**
   * Find a product by its SKU
   * @param sku The product SKU
   * @returns Product with related data
   */
  async findBySku(sku: string): Promise<ProductResponseDto> {
    try {
      const product = await this.webProductRepository.findOne({
        where: { sku },
        relations: ['images', 'catalogs', 'group'],
      });

      if (!product) {
        throw new HttpException(
          {
            success: false,
            message: `Product with SKU ${sku} not found`,
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
          message: `Failed to retrieve product with SKU ${sku}`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get the current status of the keyword generation task
   * @returns Current status of the keyword generation task
   */
  getKeywordGenerationStatus(): {
    isRunning: boolean;
    progress: {
      startTime: Date;
      endTime?: Date;
      totalProducts: number;
      processedProducts: number;
      successCount: number;
      failedCount: number;
      percentComplete: number;
      lastProcessedSku?: string;
      batchSize: number;
      concurrencyLevel?: number;
      estimatedTimeRemaining?: string;
      cacheStats?: {
        pendingTasksCount: number;
      };
      performance?: {
        averageResponseTime: number;
        consecutiveErrors: number;
        lastErrorTime?: Date;
        adaptiveDelayMs: number;
        processingRate: number;
      };
    } | null;
  } {
    if (!this.keywordGenerationStatus) {
      return { isRunning: false, progress: null };
    }

    const {
      isRunning,
      startTime,
      endTime,
      totalProducts,
      processedProducts,
      successCount,
      failedCount,
      lastProcessedSku,
      batchSize,
      concurrencyLevel,
      performanceStats,
    } = this.keywordGenerationStatus;

    // Calculate percent complete
    const percentComplete =
      totalProducts > 0
        ? Math.round((processedProducts / totalProducts) * 100)
        : 0;

    // Calculate estimated time remaining if task is running
    let estimatedTimeRemaining: string | undefined;
    if (isRunning && processedProducts > 0 && startTime) {
      const elapsedMs = Date.now() - startTime.getTime();
      const msPerProduct = elapsedMs / processedProducts;
      const remainingProducts = totalProducts - processedProducts;
      const remainingMs = msPerProduct * remainingProducts;

      // Format remaining time in a human-readable format
      if (remainingMs < 60000) {
        // Less than a minute
        estimatedTimeRemaining = `${Math.round(remainingMs / 1000)} seconds`;
      } else if (remainingMs < 3600000) {
        // Less than an hour
        estimatedTimeRemaining = `${Math.round(remainingMs / 60000)} minutes`;
      } else {
        // Hours or more
        const hours = Math.floor(remainingMs / 3600000);
        const minutes = Math.round((remainingMs % 3600000) / 60000);
        estimatedTimeRemaining = `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
      }
    }

    // Add pending tasks information
    const cacheStats = isRunning
      ? {
          pendingTasksCount: this.pendingKeywordTasks.size,
        }
      : undefined;

    // Add performance statistics if available
    let performance:
      | {
          averageResponseTime: number;
          consecutiveErrors: number;
          lastErrorTime?: Date;
          adaptiveDelayMs: number;
          processingRate: number;
        }
      | undefined;

    if (performanceStats) {
      // Calculate current processing rate (products per minute)
      const elapsedMinutes = (Date.now() - startTime.getTime()) / 60000;
      const processingRate =
        elapsedMinutes > 0
          ? Math.round((processedProducts / elapsedMinutes) * 100) / 100
          : 0;

      performance = {
        averageResponseTime: Math.round(performanceStats.averageResponseTime),
        consecutiveErrors: performanceStats.consecutiveErrors,
        lastErrorTime: performanceStats.lastErrorTime,
        adaptiveDelayMs: performanceStats.adaptiveDelayMs,
        processingRate,
      };
    }

    return {
      isRunning,
      progress: {
        startTime,
        endTime,
        totalProducts,
        processedProducts,
        successCount,
        failedCount,
        percentComplete,
        lastProcessedSku,
        batchSize,
        concurrencyLevel,
        estimatedTimeRemaining,
        cacheStats,
        performance,
      },
    };
  }

  /**
   * Generate and save keywords for all products in the database with optimized performance
   * @param options Configuration options for the generation process
   * @param username Username of the user generating the keywords
   * @returns Summary of the operation
   */
  async generateKeywordsForAllProducts(
    options: {
      batchSize?: number;
      concurrencyLevel?: number;
      prioritizeCategories?: string[];
    } = {},
    username: string,
  ): Promise<{
    totalProducts: number;
    processedProducts: number;
    successCount: number;
    failedProducts: { sku: string; reason: string }[];
  }> {
    try {
      // Default options
      const batchSize = options.batchSize || 20;
      const concurrencyLevel = options.concurrencyLevel || 5;

      // Check if a task is already running
      if (this.keywordGenerationStatus?.isRunning) {
        throw new HttpException(
          {
            success: false,
            message: 'A keyword generation task is already running',
            currentStatus: this.getKeywordGenerationStatus(),
          },
          HttpStatus.CONFLICT,
        );
      }

      // Reset pause flag
      this.pauseRequested = false;

      this.logger.log(
        `Starting optimized generation of keywords for all products (batch size: ${batchSize}, concurrency: ${concurrencyLevel})`,
        ProductService.name,
      );

      // Create a query to find products without keywords
      const baseQuery = this.webProductRepository
        .createQueryBuilder('product')
        .select([
          'product.num',
          'product.sku',
          'product.title',
          'product.matnr',
          'product.grupo',
        ])
        // .where('product.borrado = :borrado', { borrado: false });
        .where(
          "(product.search_keywords IS NULL OR product.search_keywords = '')",
        );

      // If prioritized categories are specified, prioritize those products
      let prioritizedQuery = baseQuery;

      if (options.prioritizeCategories?.length) {
        prioritizedQuery = this.webProductRepository
          .createQueryBuilder('product')
          .select([
            'product.num',
            'product.sku',
            'product.title',
            'product.matnr',
            'product.grupo',
          ])
          // .where('product.borrado = :borrado', { borrado: false })
          .where(
            "(product.search_keywords IS NULL OR product.search_keywords = '')",
          )
          .andWhere('product.grupo IN (:...categories)', {
            categories: options.prioritizeCategories,
          })
          .orderBy('product.grupo');
      }

      // Get prioritized products count
      const prioritizedCount = options.prioritizeCategories?.length
        ? await prioritizedQuery.getCount()
        : 0;

      // Get total count of all products that need keywords
      const totalProducts = await baseQuery.getCount();

      this.logger.log(
        `Found ${totalProducts} products that need keywords${
          prioritizedCount ? ` (${prioritizedCount} prioritized)` : ''
        }`,
        ProductService.name,
      );

      // Initialize result tracking
      const result = {
        totalProducts,
        processedProducts: 0,
        successCount: 0,
        failedProducts: [] as { sku: string; reason: string }[],
      };

      // Initialize status tracking
      this.keywordGenerationStatus = {
        isRunning: true,
        startTime: new Date(),
        totalProducts,
        processedProducts: 0,
        successCount: 0,
        failedCount: 0,
        batchSize,
        concurrencyLevel,
      };

      // If no products need processing, return early
      if (totalProducts === 0) {
        this.logger.log(
          'No products need keyword generation',
          ProductService.name,
        );
        this.keywordGenerationStatus.isRunning = false;
        this.keywordGenerationStatus.endTime = new Date();
        return result;
      }

      // Process products in batches
      let offset = 0;
      let remainingProducts = totalProducts;

      // First process prioritized products if any
      if (prioritizedCount > 0) {
        this.logger.log(
          `Processing ${prioritizedCount} prioritized products first`,
          ProductService.name,
        );

        let prioritizedOffset = 0;
        while (prioritizedOffset < prioritizedCount) {
          // Check if pause was requested
          if (this.pauseRequested) {
            this.logger.log(
              'Keyword generation paused by user request',
              ProductService.name,
            );

            // Wait until resumed or timeout after 1 hour
            const pauseStart = Date.now();
            while (this.pauseRequested && Date.now() - pauseStart < 3600000) {
              await new Promise((resolve) => setTimeout(resolve, 5000));
            }

            // If still paused after timeout, abort
            if (this.pauseRequested) {
              throw new Error(
                'Keyword generation aborted due to extended pause',
              );
            }

            this.logger.log('Keyword generation resumed', ProductService.name);
          }

          const currentBatchSize = Math.min(
            batchSize,
            prioritizedCount - prioritizedOffset,
          );

          // Get current batch of prioritized products
          const products = await prioritizedQuery
            .skip(prioritizedOffset)
            .take(currentBatchSize)
            .getMany();

          this.logger.log(
            `Processing batch of ${products.length} prioritized products (${prioritizedOffset + 1} to ${
              prioritizedOffset + products.length
            } of ${prioritizedCount})`,
            ProductService.name,
          );

          // Process batch with controlled concurrency
          await this.processProductBatch(
            products,
            concurrencyLevel,
            username,
            result,
          );

          prioritizedOffset += currentBatchSize;
          offset = prioritizedOffset; // Update main offset
          remainingProducts -= products.length;
        }
      }

      // Process remaining products
      if (remainingProducts > 0) {
        // Exclude already processed prioritized products
        const remainingQuery = this.webProductRepository
          .createQueryBuilder('product')
          .select([
            'product.num',
            'product.sku',
            'product.title',
            'product.matnr',
            'product.grupo',
          ])
          // .where('product.borrado = :borrado', { borrado: false })
          .where(
            "(product.search_keywords IS NULL OR product.search_keywords = '')",
          );

        // Exclude prioritized categories if they were already processed
        if (options.prioritizeCategories?.length) {
          remainingQuery.andWhere('product.grupo NOT IN (:...categories)', {
            categories: options.prioritizeCategories,
          });
        }

        // Group by category for better AI results and caching
        remainingQuery.orderBy('product.grupo');

        while (offset < totalProducts) {
          // Check if pause was requested
          if (this.pauseRequested) {
            this.logger.log(
              'Keyword generation paused by user request',
              ProductService.name,
            );

            // Wait until resumed or timeout after 1 hour
            const pauseStart = Date.now();
            while (this.pauseRequested && Date.now() - pauseStart < 3600000) {
              await new Promise((resolve) => setTimeout(resolve, 5000));
            }

            // If still paused after timeout, abort
            if (this.pauseRequested) {
              throw new Error(
                'Keyword generation aborted due to extended pause',
              );
            }

            this.logger.log('Keyword generation resumed', ProductService.name);
          }

          const currentBatchSize = Math.min(batchSize, totalProducts - offset);

          // Get current batch
          const products = await remainingQuery
            .skip(offset - prioritizedCount) // Adjust for prioritized products
            .take(currentBatchSize)
            .getMany();

          this.logger.log(
            `Processing batch of ${products.length} products (${offset + 1} to ${
              offset + products.length
            } of ${totalProducts})`,
            ProductService.name,
          );

          // Process batch with controlled concurrency
          await this.processProductBatch(
            products,
            concurrencyLevel,
            username,
            result,
          );

          offset += products.length;

          // Log progress
          this.logger.log(
            `Completed ${result.processedProducts}/${totalProducts} products. Success: ${
              result.successCount
            }, Failed: ${result.failedProducts.length}`,
            ProductService.name,
          );

          // Add a small delay between batches to avoid overwhelming the database
          // but much shorter than before
          if (offset < totalProducts) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      // Clear any residual tasks
      this.pendingKeywordTasks.clear();

      this.logger.log(
        `Keyword generation completed. Total: ${totalProducts}, Processed: ${
          result.processedProducts
        }, Success: ${result.successCount}, Failed: ${
          result.failedProducts.length
        }`,
        ProductService.name,
      );

      // Update status to complete
      this.keywordGenerationStatus.isRunning = false;
      this.keywordGenerationStatus.endTime = new Date();

      return result;
    } catch (error) {
      // Update status on error
      if (this.keywordGenerationStatus) {
        this.keywordGenerationStatus.isRunning = false;
        this.keywordGenerationStatus.endTime = new Date();
      }

      // Clear any residual tasks
      this.pendingKeywordTasks.clear();

      this.logger.error(
        `Keyword generation process failed: ${error.message}`,
        error.stack,
        ProductService.name,
      );

      throw new HttpException(
        {
          success: false,
          message: 'Keyword generation process failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Process a batch of products with controlled concurrency
   * @param products Products to process
   * @param concurrencyLevel Maximum number of concurrent operations
   * @param username Username of the user generating the keywords
   * @param result Result tracking object
   */
  private async processProductBatch(
    products: WebProduct[],
    concurrencyLevel: number,
    username: string,
    result: {
      processedProducts: number;
      successCount: number;
      failedProducts: { sku: string; reason: string }[];
    },
  ): Promise<void> {
    // Group products by category for more efficient processing
    const productsByCategory: Map<string, WebProduct[]> = new Map();

    for (const product of products) {
      const category = product.grupo || 'unknown';
      if (!productsByCategory.has(category)) {
        productsByCategory.set(category, []);
      }
      productsByCategory.get(category)!.push(product);
    }

    // Process each category group
    for (const [category, categoryProducts] of productsByCategory.entries()) {
      this.logger.debug(
        `Processing ${categoryProducts.length} products in category ${category}`,
        ProductService.name,
      );

      // Process all products with concurrency control
      const batchResults = await this.processBatchWithConcurrency(
        categoryProducts,
        concurrencyLevel,
        async (product) => {
          // Check if there's already a pending task for this product
          if (this.pendingKeywordTasks.has(product.sku)) {
            try {
              const keywords = await this.pendingKeywordTasks.get(product.sku)!;
              return { product, keywords };
            } catch (error) {
              // If pending task fails, remove it and try again
              this.pendingKeywordTasks.delete(product.sku);
              throw error;
            }
          }

          // Apply adaptive delay based on API performance
          const delayMs = this.getAdaptiveDelay();
          if (delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }

          // Create a new task with retry mechanism
          const generateWithRetry = async (
            retryCount = 0,
          ): Promise<string[]> => {
            try {
              return await this.generateKeywords({
                sku: product.sku,
              });
            } catch (error) {
              // Retry with exponential backoff if error isn't 404 (not found)
              if (
                retryCount < 3 &&
                !(
                  error instanceof HttpException &&
                  error.getStatus() === HttpStatus.NOT_FOUND
                )
              ) {
                const backoffMs = Math.pow(2, retryCount) * 1000;
                this.logger.warn(
                  `Retrying keyword generation for ${product.sku} after ${backoffMs}ms (attempt ${retryCount + 1}/3)`,
                  ProductService.name,
                );
                await new Promise((resolve) => setTimeout(resolve, backoffMs));
                return generateWithRetry(retryCount + 1);
              }
              throw error;
            }
          };

          const task = generateWithRetry();
          this.pendingKeywordTasks.set(product.sku, task);

          try {
            const keywords = await task;
            return { product, keywords };
          } finally {
            // Remove the task when done
            this.pendingKeywordTasks.delete(product.sku);
          }
        },
      );

      // Prepare bulk update
      const updates: { id: number; keywords: string }[] = [];

      // Process results
      for (const item of batchResults) {
        result.processedProducts++;
        this.keywordGenerationStatus!.processedProducts++;

        if (item.error) {
          result.failedProducts.push({
            sku: categoryProducts[batchResults.indexOf(item)].sku,
            reason: item.error.message,
          });
          this.keywordGenerationStatus!.failedCount++;
          continue;
        }

        const { product, keywords } = item.result;
        this.keywordGenerationStatus!.lastProcessedSku = product.sku;
        updates.push({
          id: product.num,
          keywords: keywords.join(', '),
        });

        result.successCount++;
        this.keywordGenerationStatus!.successCount++;
      }

      // Perform bulk update if any successful results
      if (updates.length > 0) {
        try {
          // Use query builder for more efficient bulk update
          await this.dataSource.transaction(async (manager) => {
            for (const update of updates) {
              await manager.update(
                WebProduct,
                { num: update.id },
                {
                  search_keywords: update.keywords,
                  userUpd: username,
                },
              );
            }
          });

          this.logger.debug(
            `Bulk updated ${updates.length} products with keywords`,
            ProductService.name,
          );
        } catch (error) {
          this.logger.error(
            `Error during bulk update: ${error.message}`,
            error.stack,
            ProductService.name,
          );

          // Mark affected products as failed
          for (const update of updates) {
            const product = products.find((p) => p.num === update.id);
            if (product) {
              result.failedProducts.push({
                sku: product.sku,
                reason: `Database update failed: ${error.message}`,
              });
              result.successCount--;
              this.keywordGenerationStatus!.successCount--;
              this.keywordGenerationStatus!.failedCount++;
            }
          }
        }
      }
    }
  }

  /**
   * Process items concurrently with a controlled concurrency limit
   * @param items Array of items to process
   * @param concurrencyLimit Maximum number of concurrent operations
   * @param processor Function to process each item
   * @returns Results of processing each item
   */
  private async processBatchWithConcurrency<T, R>(
    items: T[],
    concurrencyLimit: number,
    processor: (item: T, index: number) => Promise<R>,
  ): Promise<{ result: R; error?: Error }[]> {
    const results: { result?: R; error?: Error }[] = new Array(items.length);
    let activePromises = 0;
    let nextIndex = 0;

    // Process items in batches with controlled concurrency
    return new Promise((resolve) => {
      const processNext = async () => {
        const currentIndex = nextIndex++;

        // Check if we've processed all items
        if (currentIndex >= items.length) {
          // If no active promises, we're done
          if (activePromises === 0) {
            resolve(results as { result: R; error?: Error }[]);
          }
          return;
        }

        activePromises++;
        try {
          // Process the current item
          const result = await processor(items[currentIndex], currentIndex);
          results[currentIndex] = { result };
        } catch (error) {
          // Store error but continue processing
          results[currentIndex] = {
            error: error as Error,
            result: undefined as unknown as R,
          };
        } finally {
          activePromises--;
          // Process the next item
          processNext();
        }
      };

      // Start processing up to the concurrency limit
      const initialBatch = Math.min(concurrencyLimit, items.length);
      for (let i = 0; i < initialBatch; i++) {
        processNext();
      }
    });
  }

  /**
   * Request to pause the running keyword generation process
   */
  pauseKeywordGeneration(): { success: boolean; message: string } {
    if (!this.keywordGenerationStatus?.isRunning) {
      return {
        success: false,
        message: 'No keyword generation task is currently running',
      };
    }

    this.pauseRequested = true;
    return {
      success: true,
      message: 'Pause requested for keyword generation task',
    };
  }

  /**
   * Resume a paused keyword generation process
   */
  resumeKeywordGeneration(): { success: boolean; message: string } {
    if (!this.keywordGenerationStatus?.isRunning) {
      return {
        success: false,
        message: 'No keyword generation task is currently running',
      };
    }

    if (!this.pauseRequested) {
      return {
        success: false,
        message: 'Keyword generation task is not paused',
      };
    }

    this.pauseRequested = false;
    return { success: true, message: 'Keyword generation task resumed' };
  }
}
