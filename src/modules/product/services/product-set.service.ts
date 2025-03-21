import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, In, Like, Repository } from 'typeorm';
import {
  WebProduct,
  WebSetProducts,
  WebCatalog,
  WebProductImage,
  WebProductGroup,
} from '../entities/shop';
import { ProductSetResponseDto } from '../dto/product-set-response.dto';
import { DatabaseConnection } from '../../../config/database/constants';
import { ProductSetMapper } from '../mappers/product-set.mapper';
import { PaginationMeta } from '../../../config/swagger/response.schema';
import {
  ProductSetFilterDto,
  SortField,
  SortOrder,
} from '../dto/product-set-filter.dto';
import {
  CreateProductSetDto,
  CreateProductSetResultDto,
  ProductSetCreationStatus,
} from '../dto/create-product-set.dto';
import { LoggerService } from 'src/config';
import { ExternalApiService } from 'src/common';
@Injectable()
export class ProductSetService {
  constructor(
    @InjectRepository(WebSetProducts, DatabaseConnection.SHOP)
    private readonly productSetRepository: Repository<WebSetProducts>,
    @InjectRepository(WebProduct, DatabaseConnection.SHOP)
    private readonly webProductRepository: Repository<WebProduct>,
    @InjectRepository(WebCatalog, DatabaseConnection.SHOP)
    private readonly webCatalogRepository: Repository<WebCatalog>,
    @InjectRepository(WebProductImage, DatabaseConnection.SHOP)
    private readonly webProductImageRepository: Repository<WebProductImage>,
    @InjectRepository(WebProductGroup, DatabaseConnection.SHOP)
    private readonly webProductGroupRepository: Repository<WebProductGroup>,
    @InjectDataSource(DatabaseConnection.SHOP)
    private readonly shopDataSource: DataSource,
    private readonly productSetMapper: ProductSetMapper,
    private readonly externalApiService: ExternalApiService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Fetch product sets with pagination and search filters
   * @param filterDto Filter and pagination parameters
   * @returns Array of product sets with pagination metadata
   */
  async findAllPaginated(
    filterDto: ProductSetFilterDto,
  ): Promise<{ items: ProductSetResponseDto[]; pagination: PaginationMeta }> {
    try {
      const {
        page = 1,
        limit = 10,
        setSku,
        productSku,
        title,
        area,
        sortBy = SortField.UPDATE_AT,
        sortOrder = SortOrder.DESC,
      } = filterDto;

      // Ensure valid pagination parameters
      const validPage = page > 0 ? page : 1;
      const validLimit = limit > 0 ? limit : 10;

      // Calculate offset
      const offset = (validPage - 1) * validLimit;

      // Build where conditions for search
      const whereConditions: FindOptionsWhere<WebSetProducts> = {};

      // Add search filters if provided
      if (setSku) {
        whereConditions.set_sku = setSku;
      }

      if (productSku) {
        whereConditions.relations = {
          product: { sku: productSku },
        };
      }

      if (title) {
        whereConditions.title = Like(`%${title}%`);
      }

      if (area) {
        whereConditions.area = Like(`%${area}%`);
      }

      // Get total count of product sets matching the search criteria
      const totalItems = await this.productSetRepository.count({
        where: whereConditions,
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalItems / validLimit);

      // Prepare the order options for sorting
      const orderOptions: { [key: string]: 'ASC' | 'DESC' } = {};
      if (sortBy) {
        orderOptions[sortBy] = sortOrder;
      }

      // Find product sets matching the search criteria with pagination
      const productSets = await this.productSetRepository.find({
        where: whereConditions,
        skip: offset,
        take: validLimit,
        order: Object.keys(orderOptions).length > 0 ? orderOptions : undefined,
        select: {
          set_sku: true,
          title: true,
          price: true,
          compare_price: true,
          area: true,
          create_at: true,
          update_at: true,
        },
        relations: ['relations', 'relations.product'],
      });

      if (!productSets || productSets.length === 0) {
        throw new HttpException(
          {
            success: false,
            message: 'No product sets found matching your search criteria',
            error: 'NOT_FOUND',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      // Map database entities to response DTOs with related products
      const items = await Promise.all(
        productSets.map((set) => this.productSetMapper.mapToDto(set)),
      );

      // Create pagination metadata
      const pagination: PaginationMeta = {
        currentPage: validPage,
        itemsPerPage: validLimit,
        totalItems,
        totalPages,
      };

      return { items, pagination };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve product sets',
          error: error.message,
          meta: { details: error.stack },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find a product set by its SKU
   * @param sku The product set SKU
   * @returns Product set with related product data
   */
  async findBySku(setSku: string): Promise<ProductSetResponseDto> {
    try {
      const productSet = await this.productSetRepository.findOne({
        where: { set_sku: setSku },
        select: {
          set_sku: true,
          title: true,
          price: true,
          compare_price: true,
          area: true,
          create_at: true,
          update_at: true,
        },
        relations: ['relations', 'relations.product'],
      });

      if (!productSet) {
        throw new HttpException(
          {
            success: false,
            message: `Product set with SKU ${setSku} not found`,
            error: 'NOT_FOUND',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return this.productSetMapper.mapToDto(productSet);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: `Failed to retrieve product set with SKU ${setSku}`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find product sets containing a specific product by its SKU
   * @param productSku The SKU of the product to find sets for
   * @returns Array of product sets that contain the product
   */
  async findByProductSku(productSku: string): Promise<ProductSetResponseDto[]> {
    try {
      // Query product sets that contain the product with the given SKU
      const productSets = await this.productSetRepository.find({
        relations: ['relations', 'relations.product'],
        where: {
          relations: {
            product: {
              sku: productSku,
            },
          },
        },
      });

      if (!productSets || productSets.length === 0) {
        throw new HttpException(
          {
            success: false,
            message: `No product sets found containing product with SKU ${productSku}`,
            error: 'NOT_FOUND',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      // Map to response DTOs
      return productSets.map((set) => this.productSetMapper.mapToDto(set));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: `Failed to retrieve product sets for product with SKU ${productSku}`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create a product set (bundle) from multiple individual products
   * @param createSetDto DTO with set details and products to include
   * @param username Username of the creator
   * @returns Result of the product set creation
   */
  async createProductSet(
    createSetDto: CreateProductSetDto,
    username: string,
  ): Promise<CreateProductSetResultDto> {
    try {
      const { title, products } = createSetDto;
      // Log the user who is creating the set
      this.logger.log(
        `User ${username} is creating a product set titled: ${title}`,
      );

      // Extract product SKUs
      const skus = products.map((product) => product.sku);

      if (products.length < 2) {
        return {
          success: false,
          message: 'A product set must contain at least 2 products',
          status: ProductSetCreationStatus.INSUFFICIENT_PRODUCTS,
          failedProducts: skus,
        };
      }

      // Check if all products exist
      const existingProducts = await this.webProductRepository.findBy({
        sku: In(skus),
      });

      if (existingProducts.length !== skus.length) {
        const foundSkus = existingProducts.map((product) => product.sku);
        const missingSkus = skus.filter((sku) => !foundSkus.includes(sku));
        return {
          success: false,
          message: 'Some products do not exist',
          status: ProductSetCreationStatus.MISSING_PRODUCTS,
          failedProducts: missingSkus,
        };
      }

      // Check if at least one product has an image
      const productsWithImages = await this.webProductImageRepository.findBy({
        sku: In(skus),
      });

      // Check if at least one product has a Cloudflare image
      const productsWithCloudflareImages = productsWithImages.filter(
        (image) => image.src_cloudflare,
      );

      if (
        productsWithImages.length === 0 ||
        productsWithCloudflareImages.length === 0
      ) {
        return {
          success: false,
          message: 'None of the products have images',
          status: ProductSetCreationStatus.NO_IMAGES,
          failedProducts: skus,
        };
      }

      // Check if all products are from the same group
      const groups = existingProducts.map((product) => product.grupo);
      const uniqueGroups = [...new Set(groups)];
      if (uniqueGroups.length > 1) {
        return {
          success: false,
          message: 'Products must be from the same group',
          status: ProductSetCreationStatus.DIFFERENT_GROUPS,
          failedProducts: skus,
        };
      }

      const productsGroup = await this.webProductGroupRepository.findOneBy({
        group_sap: uniqueGroups[0],
      });

      if (!productsGroup) {
        return {
          success: false,
          message: 'Products group not found',
          status: ProductSetCreationStatus.MISSING_PRODUCTS_GROUP,
          failedProducts: skus,
        };
      }

      // Get price information from web_catalog
      const catalogEntries = await this.webCatalogRepository.findBy({
        sku: In(skus),
      });

      // Get unique SKUs from catalog entries
      const uniqueCatalogSkus = [
        ...new Set(catalogEntries.map((entry) => entry.sku)),
      ];

      // Check if all SKUs have at least one catalog entry
      if (uniqueCatalogSkus.length !== skus.length) {
        const missingFromCatalog = skus.filter(
          (sku) => !uniqueCatalogSkus.includes(sku),
        );
        return {
          success: false,
          message: 'Some products do not have catalog entries',
          status: ProductSetCreationStatus.MISSING_CATALOG_ENTRIES,
          failedProducts: missingFromCatalog,
        };
      }

      // Get the free product
      const freeProducts = products
        .filter((product) => (product.isFree ? 1 : 0))
        .join(',');

      // Filter catalog entries to only include those from CD01 store
      const cd01CatalogEntries = catalogEntries.filter(
        (entry) => entry.pl === 'CD01',
      );

      // Calculate total price using only CD01 entries
      const totalPrice = cd01CatalogEntries.reduce(
        (sum, entry) => sum + Number(entry.price),
        0,
      );

      // Call the stored procedure to create the set
      await this.shopDataSource.query('CALL CreateSetProduct(?, ?, ?, ?, ?)', [
        skus,
        title,
        totalPrice,
        productsGroup.area,
        freeProducts,
      ]);

      const productSet = await this.productSetRepository.findOne({
        select: {
          set_sku: true,
        },
        where: {
          title,
        },
      });

      await this.externalApiService.createProductSetBySetSku(
        productSet.set_sku,
      );

      return {
        success: true,
        message: 'Product set created successfully',
        status: ProductSetCreationStatus.CREATED,
        setSku: productSet.set_sku,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create product set by user ${username}: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        message: 'Failed to create product set',
        status: ProductSetCreationStatus.ERROR,
        error: error.message,
      };
    }
  }
}
