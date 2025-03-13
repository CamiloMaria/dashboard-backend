import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Like, Repository } from 'typeorm';
import { WebSetProducts } from '../entities/shop/web-product-set.entity';
import { ProductSetResponseDto } from '../dto/product-set-response.dto';
import { DatabaseConnection } from '../../../config/database/constants';
import { ProductSetMapper } from '../mappers/product-set.mapper';
import { PaginationMeta } from '../../../config/swagger/response.schema';
import {
  ProductSetFilterDto,
  SortField,
  SortOrder,
} from '../dto/product-set-filter.dto';

@Injectable()
export class ProductSetService {
  constructor(
    @InjectRepository(WebSetProducts, DatabaseConnection.SHOP)
    private readonly productSetRepository: Repository<WebSetProducts>,
    private readonly productSetMapper: ProductSetMapper,
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
        relationLoadStrategy: 'join',
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
}
