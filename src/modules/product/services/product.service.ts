import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebProduct } from '../entities/shop/web-product.entity';
import { ProductResponseDto } from '../dto/product-response.dto';
import { DatabaseConnection } from '../../../config/database/constants';
import { ProductMapper } from '../mappers/product.mapper';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(WebProduct, DatabaseConnection.SHOP)
    private readonly productRepository: Repository<WebProduct>,
    private readonly productMapper: ProductMapper,
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
      products.map((product) => this.productMapper.mapToDto(product)),
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

    return this.productMapper.mapToDto(product);
  }
}
