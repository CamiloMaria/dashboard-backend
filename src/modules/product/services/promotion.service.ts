import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { WebProductPromo } from '../entities/shop/web-product-promo.entity';
import { PromotionResponseDto } from '../dto/promotion-response.dto';
import { DatabaseConnection } from '../../../config/database/constants';
import { PromotionMapper } from '../mappers/promotion.mapper';
import { PaginationMeta } from '../../../config/swagger/response.schema';
import {
  PromotionFilterDto,
  SortField,
  SortOrder,
} from '../dto/promotion-filter.dto';

@Injectable()
export class PromotionService {
  constructor(
    @InjectRepository(WebProductPromo, DatabaseConnection.SHOP)
    private readonly promotionRepository: Repository<WebProductPromo>,
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
        sortBy = SortField.CREATE_AT,
        sortOrder = SortOrder.DESC,
      } = filterDto;

      // Ensure valid pagination parameters
      const validPage = page > 0 ? page : 1;
      const validLimit = limit > 0 ? limit : 10;

      // Calculate offset
      const offset = (validPage - 1) * validLimit;

      // Build where conditions for search
      const whereConditions: FindOptionsWhere<WebProductPromo> = {};

      // Add search filters if provided
      if (no_promo) {
        whereConditions.no_promo = no_promo;
      }

      if (sku) {
        whereConditions.sku = sku;
      }

      if (matnr) {
        whereConditions.matnr = matnr;
      }

      if (shop) {
        whereConditions.shop = shop;
      }

      // Set status to active (1) by default
      whereConditions.status = 1;

      // Get total count of promotions matching the search criteria
      const totalItems = await this.promotionRepository.count({
        where: whereConditions,
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalItems / validLimit);

      // Prepare the order options for sorting
      const orderOptions: { [key: string]: 'ASC' | 'DESC' } = {};
      if (sortBy) {
        orderOptions[sortBy] = sortOrder;
      }

      // Find promotions matching the search criteria with pagination
      // Don't eagerly load relations to avoid slow queries with non-indexed columns
      const promotions = await this.promotionRepository.find({
        where: whereConditions,
        skip: offset,
        take: validLimit,
        order: Object.keys(orderOptions).length > 0 ? orderOptions : undefined,
      });

      if (!promotions || promotions.length === 0) {
        throw new HttpException(
          {
            success: false,
            message: 'No promotions found matching your search criteria',
            error: 'NOT_FOUND',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      // Map database entities to response DTOs without eager relations
      // Product titles will be empty initially
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
