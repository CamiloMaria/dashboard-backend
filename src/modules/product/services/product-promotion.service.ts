import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { WebProductPromo } from '../entities/shop/web-product-promo.entity';
import { PromotionResponseDto } from '../dto/promotion-response.dto';
import { DatabaseConnection } from '../../../config/database/constants';
import { PromotionMapper } from '../mappers/promotion.mapper';
import { PaginationMeta } from '../../../common/schemas/response.schema';
import {
  PromotionFilterDto,
  SortField,
  SortOrder,
} from '../dto/promotion-filter.dto';
import { WebProduct } from '../entities/shop/web-product.entity';

@Injectable()
export class PromotionService {
  constructor(
    @InjectRepository(WebProductPromo, DatabaseConnection.SHOP)
    private readonly promotionRepository: Repository<WebProductPromo>,
    @InjectRepository(WebProduct, DatabaseConnection.SHOP)
    private readonly productRepository: Repository<WebProduct>,
    private readonly promotionMapper: PromotionMapper,
  ) {}

  /**
   * Fetch promotions with pagination and search filters
   * @param filterDto Filter and pagination parameters
   * @returns Array of promotions with pagination metadata
   */
  async findAllPaginated(
    filterDto: PromotionFilterDto,
  ): Promise<{ items: PromotionResponseDto[]; meta: PaginationMeta }> {
    try {
      const {
        page = 1,
        limit = 10,
        no_promo,
        sku,
        matnr,
        shop,
        search,
        sortBy = SortField.CREATE_AT,
        sortOrder = SortOrder.DESC,
      } = filterDto;

      // Ensure valid pagination parameters
      const validPage = page > 0 ? page : 1;
      const validLimit = limit > 0 ? limit : 10;

      // Calculate offset
      const offset = (validPage - 1) * validLimit;

      // Create query builder
      const queryBuilder = this.promotionRepository
        .createQueryBuilder('promo')
        .select([
          'promo.no_promo as no_promo',
          'promo.sku as sku',
          'promo.matnr as matnr',
          'promo.price as price',
          'promo.compare_price as compare_price',
          'promo.create_at as create_at',
          'promo.status as status',
          'promo.shop as shop',
        ])
        .where('promo.status = :status', { status: 1 });

      // Apply search filters
      if (search) {
        queryBuilder.andWhere(
          '(promo.no_promo LIKE :search OR promo.sku LIKE :search OR promo.matnr LIKE :search OR promo.shop LIKE :search)',
          { search: `%${search}%` },
        );
      } else {
        // Apply specific filters if provided
        if (no_promo) {
          queryBuilder.andWhere('promo.no_promo = :no_promo', { no_promo });
        }

        if (sku) {
          queryBuilder.andWhere('promo.sku = :sku', { sku });
        }

        if (matnr) {
          queryBuilder.andWhere('promo.matnr = :matnr', { matnr });
        }

        if (shop) {
          queryBuilder.andWhere('promo.shop = :shop', { shop });
        }
      }

      // Apply sorting
      queryBuilder.orderBy(`promo.${sortBy}`, sortOrder);

      // Get total count for pagination
      const totalItems = await queryBuilder.getCount();

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalItems / validLimit);

      // Apply pagination
      queryBuilder.skip(offset).take(validLimit);

      // Execute query
      const promotions = await queryBuilder.getRawMany();

      const products = await this.productRepository.find({
        where: {
          sku: In(promotions.map((promotion) => promotion.sku)),
        },
      });

      const productsMap = new Map<string, WebProduct>();
      products.forEach((product) => {
        productsMap.set(product.sku, product);
      });
      promotions.forEach((promotion: WebProductPromo) => {
        if (!promotion.product) {
          promotion.product = {
            title: productsMap.get(promotion.sku)?.title || '',
          } as any;
        } else {
          promotion.product.title = productsMap.get(promotion.sku)?.title || '';
        }
      });

      // if (!promotions || promotions.length === 0) {
      //   throw new HttpException(
      //     {
      //       success: false,
      //       message: 'No promotions found matching your search criteria',
      //       error: 'NOT_FOUND',
      //     },
      //     HttpStatus.NOT_FOUND,
      //   );
      // }

      // Map database entities to response DTOs
      const items = await Promise.all(
        promotions.map((promotion) => this.promotionMapper.mapToDto(promotion)),
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
          message: 'Failed to retrieve promotions',
          error: error.message,
          meta: { details: error.stack },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find a promotion by its ID
   * @param id The promotion ID
   * @returns Promotion with related data
   */
  async findById(id: number): Promise<PromotionResponseDto> {
    try {
      const promotion = await this.promotionRepository.findOne({
        where: { no_promo: id, status: 1 },
        relations: ['product', 'promo'], // Load both relations at once
        select: {
          no_promo: true,
          sku: true,
          matnr: true,
          price: true,
          compare_price: true,
          create_at: true,
          status: true,
          shop: true,
        },
        relationLoadStrategy: 'query', // More efficient loading strategy
      });

      if (!promotion) {
        throw new HttpException(
          {
            success: false,
            message: `Promotion with ID ${id} not found`,
            error: 'NOT_FOUND',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return this.promotionMapper.mapToDto(promotion);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: `Failed to retrieve promotion with ID ${id}`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
