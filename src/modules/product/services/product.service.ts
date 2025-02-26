import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebProduct } from '../entities/shop/web-product.entity';
import { WebCatalog } from '../entities/shop/web-catalog.entity';
import { WebProductImage } from '../entities/shop/web-product-image.entity';
import { WebProductGroup } from '../entities/shop/web-product-group.entity';
import {
  ProductResponseDto,
  ProductImageResponseDto,
  ProductInventoryResponseDto,
} from '../dto/product-response.dto';
import { DatabaseConnection } from '../../../config/database/constants';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(WebProduct, DatabaseConnection.SHOP)
    private readonly productRepository: Repository<WebProduct>,
    @InjectRepository(WebCatalog, DatabaseConnection.SHOP)
    private readonly catalogRepository: Repository<WebCatalog>,
    @InjectRepository(WebProductImage, DatabaseConnection.SHOP)
    private readonly productImageRepository: Repository<WebProductImage>,
    @InjectRepository(WebProductGroup, DatabaseConnection.SHOP)
    private readonly productGroupRepository: Repository<WebProductGroup>,
  ) {}

  /**
   * Fetch all products with their related images and inventory
   * @returns Array of products with related data
   */
  async findAll(): Promise<ProductResponseDto[]> {
    // Find all active products with their related images and catalogs
    const products = await this.productRepository.find({
      where: { borrado: false },
      relations: ['images', 'catalogs'],
      take: 10,
    });

    if (!products || products.length === 0) {
      throw new NotFoundException('No products found');
    }

    // Map database entities to response DTOs
    return Promise.all(
      products.map((product) => this.mapProductToDto(product)),
    );
  }

  /**
   * Find a product by its ID
   * @param id The product ID
   * @returns Product with related data
   */
  async findById(id: number): Promise<ProductResponseDto> {
    const product = await this.productRepository.findOne({
      where: { num: id, borrado: false },
      relations: ['images', 'catalogs'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return this.mapProductToDto(product);
  }

  /**
   * Maps a WebProduct entity to a ProductResponseDto
   * @param product The product entity
   * @returns Formatted product DTO
   */
  private async mapProductToDto(
    product: WebProduct,
  ): Promise<ProductResponseDto> {
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
    const images: ProductImageResponseDto[] =
      product.images?.map((image) => ({
        id: image.id,
        position: image.position,
        width: image.width,
        height: image.height,
        alt: image.alt,
        src: `${image.src_cloudflare}/base`,
        created_at: image.created_at,
        updated_at: image.updated_at,
        status: image.status,
      })) || [];

    // Map inventory (catalogs)
    const inventory: ProductInventoryResponseDto[] =
      product.catalogs?.map((catalog) => ({
        id: catalog.id,
        stock: catalog.stock,
        centro: catalog.pl,
        price: catalog.price,
        compare_price: catalog.compare_price,
        status: catalog.status,
        fecha: catalog.update_at,
      })) || [];

    // Fetch product group data for category and bigItems
    let category = '';
    let bigItems = product.centerd;

    if (product.grupo) {
      const productGroup = await this.productGroupRepository.findOne({
        where: { group_sap: product.grupo },
      });

      if (productGroup) {
        category = productGroup.cat_app || '';
        bigItems = productGroup.bigItems;
      }
    }

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
