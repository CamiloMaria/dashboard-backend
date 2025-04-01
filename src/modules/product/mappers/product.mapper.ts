import { Injectable } from '@nestjs/common';
import { WebProduct } from '../entities/shop/web-product.entity';
import {
  ProductResponseDto,
  ProductImageResponseDto,
  ProductCatalogResponseDto,
  ProductGroupResponseDto,
} from '../dto/product-response.dto';
import { WebCatalog } from '../entities/shop/web-catalog.entity';
import { WebProductGroup } from '../entities/shop/web-product-group.entity';

@Injectable()
export class ProductMapper {
  /**
   * Maps a WebProduct entity to a ProductResponseDto
   */
  public mapToDto(product: WebProduct): ProductResponseDto {
    // Parse JSON fields if they exist
    const searchKeywords = product.search_keywords
      ? this.tryParseJson(product.search_keywords, [])
      : [];

    const shopsDisable = product.shops_disable
      ? this.tryParseJson(product.shops_disable, [])
      : [];

    const specifications = product.specifications
      ? this.tryParseJson(product.specifications, [])
      : [];

    // Map images
    const images = this.mapImages(product.images);

    // Map catalogs
    const catalogs = this.mapCatalog(product.catalogs);

    // Map group
    const group = this.mapGroup(product.group);

    // Create main product DTO
    return {
      id: product.num,
      sku: product.sku,
      title: product.title,
      material: product.matnr,
      depto: product.depto,
      grupo: product.grupo,
      type_tax: product.type_tax,
      description_instaleap: product.description_instaleap,
      category: group,
      image_url: this.extractMainImageUrl(product.images_url, images),
      unit: product.unmanejo,
      isActive: !product.borrado,
      stock: this.calculateTotalStock(catalogs),
      without_stock: product.without_stock,
      borrado_comment: product.borrado_comment,
      shops_disable: shopsDisable,
      userAdd: product.userAdd,
      userUpd: product.userUpd,
      is_set: product.is_set ? 1 : 0,
      security_stock: product.security_stock,
      brand: product.brand,
      search_keywords: searchKeywords,
      create_at: product.create_at,
      update_at: product.update_at,
      images,
      specifications,
      catalogs,
    };
  }

  /**
   * Maps WebProductImage entities to DTOs
   */
  private mapImages(images: any[]): ProductImageResponseDto[] {
    if (!images || images.length === 0) return [];

    return images.map((image) => ({
      id: image.id,
      position: image.position,
      width: image.width,
      height: image.height,
      alt: image.alt,
      src: `${image.src_cloudflare}/base`,
      created_at: image.created_at,
      updated_at: image.updated_at,
      status: image.status,
    }));
  }

  /**
   * Maps WebCatalog entities to catalogs DTOs
   */
  private mapCatalog(catalogs: WebCatalog[]): ProductCatalogResponseDto[] {
    if (!catalogs || catalogs.length === 0) return [];

    return catalogs.map((catalog) => ({
      id: catalog.id,
      stock: catalog.stock,
      shop: catalog.pl,
      price: Number(catalog.price),
      compare_price: Number(catalog.compare_price),
      status: catalog.status,
      status_comment: catalog.status_comment,
      manual_override: catalog.manual_override ? true : false,
      status_changed_at: catalog.status_changed_at,
      status_changed_by: catalog.status_changed_by,
      updated_at: catalog.update_at,
    }));
  }

  private mapGroup(group: WebProductGroup): ProductGroupResponseDto {
    if (!group) return null;

    return {
      id: group.id,
      group_sap: group.group_sap,
      description: group.description,
      depto: group.depto,
      depto_sap: group.depto_sap,
      area: group.area,
      cat_app: group.cat_app,
      shops_stock: group.shops_stock,
      status: group.status,
      level2: group.level2,
      level3: group.level3,
      level1_instaleap: group.level1_instaleap,
      level2_instaleap: group.level2_instaleap,
      level3_instaleap: group.level3_instaleap,
      bigItems: group.bigItems,
      delivery: group.delivery,
      delivery_depto: group.delivery_depto,
    };
  }

  /**
   * Try to parse a JSON string, return default value if parsing fails
   */
  private tryParseJson(jsonString: string, defaultValue: any): any {
    try {
      return JSON.parse(jsonString);
    } catch {
      return defaultValue;
    }
  }

  /**
   * Extract the main image URL from either product images or images_url field
   */
  private extractMainImageUrl(
    imagesUrl: string,
    images: ProductImageResponseDto[],
  ): string {
    // First try to get from images array
    if (images && images.length > 0) {
      // Find the image with position = 1 or the first image
      const mainImage = images.find((img) => img.position === 1) || images[0];
      return mainImage.src;
    }

    // Fall back to images_url if it exists
    if (imagesUrl) {
      try {
        const parsedImages = JSON.parse(imagesUrl);
        if (Array.isArray(parsedImages) && parsedImages.length > 0) {
          return parsedImages[0].src;
        }
      } catch {
        // If not valid JSON, maybe it's just a direct URL
        return imagesUrl;
      }
    }

    // Default placeholder
    return '';
  }

  /**
   * Calculate total stock across all catalogs items
   */
  private calculateTotalStock(catalogs: ProductCatalogResponseDto[]): number {
    if (!catalogs || catalogs.length === 0) return 0;
    return catalogs.reduce((total, item) => total + (item.stock || 0), 0);
  }
}
