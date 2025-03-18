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
import { EnvService, LoggerService } from 'src/config';
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
    private readonly envService: EnvService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Fetch product sets with pagination and search filters
   * @param filterDto Filter and pagination parameters
   * @returns Array of product sets with pagination metadata
   */
  async findAllPaginated(
    filterDto: ProductSetFilterDto,
  ): Promise<{ items: ProductSetResponseDto[]; meta: PaginationMeta }> {
    try {
      const {
        page = 1,
        limit = 10,
        set_sku,
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
      if (set_sku) {
        whereConditions.set_sku = set_sku;
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
  async findBySku(sku: string): Promise<ProductSetResponseDto> {
    try {
      const productSet = await this.productSetRepository.findOne({
        where: { set_sku: sku },
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
            message: `Product set with SKU ${sku} not found`,
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
          message: `Failed to retrieve product set with SKU ${sku}`,
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

      // Map database entities to response DTOs
      return Promise.all(
        productSets.map((set) => this.productSetMapper.mapToDto(set)),
      );
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

      // Calculate stock as the minimum stock from CD01 catalog entries
      const stock =
        cd01CatalogEntries.length > 0
          ? Math.min(
              ...cd01CatalogEntries.map((entry) => Number(entry.stock) || 0),
            )
          : 0;

      // Call the stored procedure to create the set
      await this.shopDataSource.query('CALL CreateSetProduct(?, ?, ?, ?, ?)', [
        skus,
        title,
        totalPrice,
        productsGroup.area,
        freeProducts,
      ]);

      for (const catalogEntry of catalogEntries) {
        await this.externalApiService.updateCatalogInInstaleap(
          {
            sku: catalogEntry.sku,
            storeReference: catalogEntry.pl,
          },
          {
            isActive: false,
          },
        );

        if (catalogEntry.pl === 'PL08') {
          await this.externalApiService.updateCatalogInInstaleap(
            {
              sku: catalogEntry.sku,
              storeReference: `${catalogEntry.pl}-D`,
            },
            { isActive: false },
          );
        }
      }

      const productSet = await this.productSetRepository.findOneBy({
        title,
      });

      // Get all images from the first product that has images
      // Extract image URLs from the products with images
      const productImages = productsWithCloudflareImages
        .map((product) => product.src_cloudflare)
        .filter(Boolean);

      await this.externalApiService.createProductInstaleap({
        name: productSet.title,
        sku: productSet.set_sku,
        unit: existingProducts[0].unmanejo || 'UND',
        photosUrl:
          productImages && productImages.length > 0
            ? productImages
            : [`${this.envService.baseCloudflareImg}/base`],
        ean: [productSet.set_sku],
        description: existingProducts[0].description_instaleap,
        bigItems: productsGroup.bigItems,
        brand: existingProducts[0].brand,
      });

      // Get unique store references (pl values) from catalog entries
      const uniqueStores = [
        ...new Set(catalogEntries.map((entry) => entry.pl)),
      ];

      // Create a catalog entry in Instaleap for each store
      for (const storeReference of uniqueStores) {
        await this.externalApiService.createCatalogInInstaleap({
          product: {
            sku: productSet.set_sku,
          },
          store: {
            storeReference,
          },
          categoriesAggregated: [
            {
              categoryReference: productsGroup.level1_instaleap,
            },
            {
              categoryReference: productsGroup.level2_instaleap,
            },
            {
              categoryReference: productsGroup.level3_instaleap,
            },
          ],
          price: Number(productSet.price),
          stock: stock,
          isActive: stock > existingProducts[0].security_stock,
          securityStock: existingProducts[0].security_stock,
        });

        // For PL08, also create a catalog entry for PL08-D
        if (storeReference === 'PL08') {
          await this.externalApiService.createCatalogInInstaleap({
            product: {
              sku: productSet.set_sku,
            },
            store: {
              storeReference: `${storeReference}-D`,
            },
            categoriesAggregated: [
              {
                categoryReference: productsGroup.level1_instaleap,
              },
              {
                categoryReference: productsGroup.level2_instaleap,
              },
              {
                categoryReference: productsGroup.level3_instaleap,
              },
            ],
            price: productSet.price,
            stock: stock,
            isActive: stock > existingProducts[0].security_stock,
            securityStock: existingProducts[0].security_stock,
          });
        }
      }

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
