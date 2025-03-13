import { Injectable } from '@nestjs/common';
import { WebProductPromo } from '../entities/shop/web-product-promo.entity';
import { PromotionResponseDto } from '../dto/promotion-response.dto';
import { sanitizeString } from '../../../common/utils/string.utils';

@Injectable()
export class PromotionMapper {
  /**
   * Maps a WebProductPromo entity to a PromotionResponseDto
   * Relations are pre-loaded by the service
   * @param promotion The promotion entity with loaded relations
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
    dto.create_at = promotion.create_at;
    dto.status = promotion.status;
    dto.shop = promotion.shop;

    // Map relations using pre-loaded data
    if (promotion.product) {
      dto.product_title = sanitizeString(promotion.product.title);
    } else {
      dto.product_title = null;
    }

    if (promotion.promo) {
      dto.promo_mapa = promotion.promo.mapa;
    } else {
      dto.promo_mapa = null;
    }

    return dto;
  }
}
