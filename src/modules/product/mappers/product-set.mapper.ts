import { Injectable } from '@nestjs/common';
import { WebSetProducts } from '../entities/shop/web-product-set.entity';
import { ProductSetResponseDto } from '../dto/product-set-response.dto';
import { ProductSetItemDto } from '../dto/product-set-item.dto';
import { sanitizeString, trimOrNull } from '../../../common/utils/string.utils';

@Injectable()
export class ProductSetMapper {
  /**
   * Maps a WebSetProducts entity to a ProductSetResponseDto
   * Relations are pre-loaded by the service
   * @param set The product set entity with loaded relations
   * @returns The mapped DTO
   */
  mapToDto(set: WebSetProducts): ProductSetResponseDto {
    const dto = new ProductSetResponseDto();

    // Map basic properties
    dto.set_sku = set.set_sku;
    dto.title = sanitizeString(set.title);
    dto.price = set.price;
    dto.compare_price = set.compare_price;
    dto.area = sanitizeString(set.area);
    dto.create_at = set.create_at;
    dto.update_at = set.update_at;

    // Map related products using pre-loaded relations
    dto.products = this.mapSetProducts(set);

    return dto;
  }

  /**
   * Map set products using pre-loaded relations
   * @param set The product set with pre-loaded relations
   * @returns Array of products in the set
   */
  private mapSetProducts(set: WebSetProducts): ProductSetItemDto[] {
    if (!set.relations || set.relations.length === 0) {
      return [];
    }

    // Map relations to product DTOs
    return set.relations.map((relation) => {
      const dto = new ProductSetItemDto();
      dto.productSku = relation.productSku;
      dto.is_free = relation.is_free;

      // Use trimOrNull to handle product title
      dto.title = relation.product ? trimOrNull(relation.product.title) : null;

      // Get price and compare_price from catalog if available
      if (
        relation.product &&
        relation.product.catalogs &&
        relation.product.catalogs.length > 0
      ) {
        // Use the first catalog entry for pricing information
        const catalog = relation.product.catalogs[0];
        dto.price = catalog.price;
        dto.compare_price = catalog.compare_price;
      } else {
        dto.price = null;
        dto.compare_price = null;
      }

      return dto;
    });
  }
}
