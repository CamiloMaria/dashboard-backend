import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebProductPromo } from '../entities/shop/web-product-promo.entity';
import { WebProduct } from '../entities/shop/web-product.entity';
import { WebPromo } from '../entities/shop/web-promo.entity';
import { PromotionResponseDto } from '../dto/promotion-response.dto';
import { DatabaseConnection } from '../../../config/database/constants';

@Injectable()
export class PromotionMapper {
  constructor(
    @InjectRepository(WebProduct, DatabaseConnection.SHOP)
    private readonly productRepository: Repository<WebProduct>,
    @InjectRepository(WebPromo, DatabaseConnection.SHOP)
    private readonly promoRepository: Repository<WebPromo>,
  ) {}

  /**
   * Maps a WebProductPromo entity to a PromotionResponseDto
   * @param promotion The promotion entity
   * @returns The mapped DTO
   */
  async mapToDto(promotion: WebProductPromo): Promise<PromotionResponseDto> {
    const dto = new PromotionResponseDto();

    // Map basic properties
    dto.no_promo = promotion.no_promo;
    dto.sku = promotion.sku;
    dto.matnr = promotion.matnr;
    dto.price = promotion.price;
    dto.compare_price = promotion.compare_price;
    dto.status = promotion.status;
    dto.shop = promotion.shop;
    dto.create_at = promotion.create_at;

    // Only fetch product data if we have a SKU and product relation isn't loaded
    if (dto.sku && (!promotion.product || !promotion.product.title)) {
      try {
        const product = await this.productRepository.findOne({
          where: { sku: dto.sku },
          select: ['title'],
        });

        if (product) {
          dto.product_title = product.title;
        }
      } catch {
        // If product lookup fails, continue without product title
        dto.product_title = null;
      }
    } else if (promotion.product) {
      // If relation is already loaded, use it
      dto.product_title = promotion.product.title;
    }

    // Only fetch promo data if promo relation isn't loaded
    if (!promotion.promo || !promotion.promo.mapa) {
      try {
        const promo = await this.promoRepository.findOne({
          where: { no_promo: dto.no_promo },
          select: ['mapa'],
        });

        if (promo) {
          dto.promo_mapa = promo.mapa;
        }
      } catch {
        // If promo lookup fails, continue without promo name
        dto.promo_mapa = null;
      }
    } else {
      // If relation is already loaded, use it
      dto.promo_mapa = promotion.promo.mapa;
    }

    return dto;
  }
}
