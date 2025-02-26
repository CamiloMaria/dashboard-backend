import { Injectable } from '@nestjs/common';
import { WebProduct } from '../entities/shop/web-product.entity';
import { WebProductGroup } from '../entities/shop/web-product-group.entity';
import {
  ProductResponseDto,
  ProductImageResponseDto,
  ProductInventoryResponseDto,
} from '../dto/product-response.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DatabaseConnection } from '../../../config/database/constants';

@Injectable()
export class ProductMapper {
  constructor(
    @InjectRepository(WebProductGroup, DatabaseConnection.SHOP)
    private readonly productGroupRepository: Repository<WebProductGroup>,
  ) {}

  /**
   * Maps a WebProduct entity to a ProductResponseDto
   */
  public async mapToDto(product: WebProduct): Promise<ProductResponseDto> {
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
    const images = this.mapImages(product.images || []);

    // Map inventory (catalogs)
    const inventory = this.mapInventory(product.catalogs || []);

    // Fetch product group data for category and bigItems
    const { category, bigItems } = await this.fetchProductGroupData(
      product.grupo,
      product.centerd,
    );

    // Create main product DTO
    return {
      id: product.num,
      sku: product.sku,
      title: product.title,
      price: product.price,
      compare_price: product.compare_price,
      material: product.matnr,
      depto: product.depto,
      grupo: product.grupo,
      type_tax: product.type_tax,
      description_instaleap: product.description_instaleap,
      category,
      bigItems,
      image_url: this.extractMainImageUrl(product.images_url, images),
      unit: product.unmanejo,
      isActive: !product.borrado,
      stock: this.calculateTotalStock(inventory),
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
      inventory,
    };
  }

  /**
   * Maps WebProductImage entities to DTOs
   */
  private mapImages(images: any[]): ProductImageResponseDto[] {
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
   * Maps WebCatalog entities to inventory DTOs
   */
  private mapInventory(catalogs: any[]): ProductInventoryResponseDto[] {
    return catalogs.map((catalog) => ({
      id: catalog.id,
      stock: catalog.stock,
      centro: catalog.pl,
      price: catalog.price,
      compare_price: catalog.compare_price,
      status: catalog.status,
      fecha: catalog.update_at,
    }));
  }

  /**
   * Fetches product group data for category and bigItems
   */
  private async fetchProductGroupData(
    groupSap: string,
    defaultBigItems: number,
  ): Promise<{ category: string; bigItems: number }> {
    let category = '';
    let bigItems = defaultBigItems;

    if (groupSap) {
      const productGroup = await this.productGroupRepository.findOne({
        where: { group_sap: groupSap },
      });

      if (productGroup) {
        category = productGroup.cat_app || '';
        bigItems = productGroup.bigItems;
      }
    }

    return { category, bigItems };
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
   * Calculate total stock across all inventory items
   */
  private calculateTotalStock(
    inventory: ProductInventoryResponseDto[],
  ): number {
    if (!inventory || inventory.length === 0) return 0;
    return inventory.reduce((total, item) => total + (item.stock || 0), 0);
  }
}
