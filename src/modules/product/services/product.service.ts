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
import { LoggerService } from 'src/config';
import { WebProductGroup } from '../entities/shop/web-product-group.entity';
import { GenerateKeywordsDto } from '../dto/generate-keywords.dto';
import { ProductPatchDto } from '../dto/product-update.dto';
import { WebCatalog } from '../entities/shop/web-catalog.entity';
import { WebProductRemoved } from '../entities/shop/web-product-removed.entity';
import { WebProductImage } from '../entities/shop/web-product-image.entity';

@Injectable()
export class ProductService {
  private readonly DEFAULT_STORE = 'PL09';

  constructor(
    @InjectRepository(WebProduct, DatabaseConnection.SHOP)
    private readonly webProductRepository: Repository<WebProduct>,
    @InjectRepository(WebProductGroup, DatabaseConnection.SHOP)
    private readonly webProductGroupRepository: Repository<WebProductGroup>,
    @InjectRepository(WebCatalog, DatabaseConnection.SHOP)
    private readonly webCatalogRepository: Repository<WebCatalog>,
    @InjectRepository(WebProductImage, DatabaseConnection.SHOP)
    private readonly webProductImageRepository: Repository<WebProductImage>,
    @InjectRepository(WebProductRemoved, DatabaseConnection.SHOP)
    private readonly webProductRemovedRepository: Repository<WebProductRemoved>,
    private readonly productMapper: ProductMapper,
    private readonly externalApiService: ExternalApiService,
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

        if (title) {
          whereConditions =
            typeof whereConditions === 'object' ? whereConditions : {};
          whereConditions.title = Like(`%${title}%`);
        }

        if (matnr) {
          whereConditions =
            typeof whereConditions === 'object' ? whereConditions : {};
          whereConditions.matnr = Like(`%${matnr}%`);
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
      const prompt = `Hola, estamos creando un e-commerce en 
      República Dominicana y necesitamos crear una descripción comercial
      para cada producto de nuestro catalogo que contenga los regionalismos 
      clásicos del pais. Para esta tarea, te voy a dar el titulo del producto.
      Tu trabajo ahora es ayúdarme a generar una descripción comercial 
      para el siguiente producto: ${productTitle}. 
      Quiero que solo me respondas con el texto en formato html.`;

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
   * Generate SEO keywords for a product using ChatGPT
   * @param productTitle The title of the product
   * @param productCategory The category of the product
   * @returns Comma-separated list of SEO keywords
   */
  async generateKeywords(generateDto: GenerateKeywordsDto): Promise<string[]> {
    try {
      const { sku } = generateDto;

      // Get product matnr from sku
      const product = await this.webProductRepository.findOne({
        select: {
          title: true,
          matnr: true,
          grupo: true,
        },
        where: { sku },
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

      // Get product category from grupo
      const productCategory = await this.webProductGroupRepository.findOne({
        select: { cat_app: true },
        where: { group_sap: product.grupo },
      });

      if (!productCategory) {
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
      son estas: ${productCategory.cat_app}. Necesito que solo me respondas con el 
      resultado sea una lista seperada por comma.`;

      const content = await this.externalApiService.callChatGptApi([
        { role: 'user', content: prompt },
      ]);

      // Just trim any extra whitespace
      const keywords = content.split(',').map((keyword) => keyword.trim());

      // Add matnr to keywords
      return [product.matnr, ...keywords];
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

    // Create success products in Instaleap
    const successProducts = results.filter((result) => result.success);
    if (successProducts.length > 0) {
      await this.externalApiService.createProductInstaleapBySkuBatch(
        successProducts.map((product) => product.sku),
      );
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
        relations: ['images', 'catalogs'],
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

        // Update fields only if they are provided
        if (title !== undefined) product.title = title;
        if (description_instaleap !== undefined)
          product.description_instaleap = description_instaleap;
        if (specifications !== undefined)
          product.specifications = specifications;
        if (search_keywords !== undefined)
          product.search_keywords = search_keywords;
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
          borrado !== undefined
        ) {
          try {
            await this.externalApiService.updateProductInstaleap(product.sku, {
              name: title,
              description: description_instaleap,
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
          }

          // Update status comment if provided
          if (catalogUpdate.status_comment !== undefined) {
            catalog.status_comment = catalogUpdate.status_comment;
          }

          // Update manual override if explicitly provided
          if (catalogUpdate.manual_override !== undefined) {
            catalog.manual_override = catalogUpdate.manual_override;
          }

          // Save the updated catalog
          await this.webCatalogRepository.save(catalog);

          // Update catalog in Instaleap if needed
          if (catalogUpdate.status !== undefined) {
            try {
              await this.externalApiService.updateCatalogInInstaleap(
                {
                  sku: catalog.sku,
                  storeReference: catalog.pl,
                },
                {
                  isActive: catalog.status === 1,
                },
              );
            } catch (instaleapError) {
              this.logger.error(
                `Failed to update catalog ${catalog.sku}/${catalog.pl} in Instaleap: ${instaleapError.message}`,
                instaleapError.stack,
              );
              // Continue with the process even if Instaleap update fails
            }
          }
        }
      }

      // Reload the product with its updated relations
      const updatedProduct = await this.webProductRepository.findOne({
        where: { num: productId },
        relations: ['images', 'catalogs'],
      });

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
          relations: ['catalogs', 'images'],
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
}
