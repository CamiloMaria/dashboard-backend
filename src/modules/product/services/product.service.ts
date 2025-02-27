import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Like, Repository } from 'typeorm';
import { WebProduct } from '../entities/shop/web-product.entity';
import { ProductResponseDto } from '../dto/product-response.dto';
import { DatabaseConnection } from '../../../config/database/constants';
import { ProductMapper } from '../mappers/product.mapper';
import { PaginationMeta } from '../../../config/swagger/response.schema';
import {
  ProductFilterDto,
  SortField,
  SortOrder,
} from '../dto/product-filter.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(WebProduct, DatabaseConnection.SHOP)
    private readonly productRepository: Repository<WebProduct>,
    private readonly productMapper: ProductMapper,
  ) {}

  /**
   * Fetch products with pagination and search filters
   * @param filterDto Filter and pagination parameters
   * @returns Array of products with related data and pagination metadata
   */
  async findAllPaginated(
    filterDto: ProductFilterDto,
  ): Promise<{ items: ProductResponseDto[]; meta: PaginationMeta }> {
    const {
      page = 1,
      limit = 10,
      sku,
      title,
      matnr,
      sortBy = SortField.TITLE,
      sortOrder = SortOrder.ASC,
    } = filterDto;

    // Ensure valid pagination parameters
    const validPage = page > 0 ? page : 1;
    const validLimit = limit > 0 ? limit : 10;

    // Calculate offset
    const offset = (validPage - 1) * validLimit;

    // Build where conditions for search
    const whereConditions: FindOptionsWhere<WebProduct> = {};

    // Add search filters if provided
    if (sku) {
      whereConditions.sku = sku;
    }

    if (title) {
      whereConditions.title = Like(`%${title}%`);
    }

    if (matnr) {
      whereConditions.matnr = matnr;
    }

    // Get total count of active products matching the search criteria
    const totalItems = await this.productRepository.count({
      where: whereConditions,
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalItems / validLimit);

    // Prepare the order options for sorting
    const orderOptions: { [key: string]: 'ASC' | 'DESC' } = {};
    if (sortBy) {
      orderOptions[sortBy] = sortOrder;
    }

    // Find products matching the search criteria with pagination
    const products = await this.productRepository.find({
      where: whereConditions,
      relations: ['images', 'catalogs'],
      skip: offset,
      take: validLimit,
      order: Object.keys(orderOptions).length > 0 ? orderOptions : undefined,
    });

    if (!products || products.length === 0) {
      throw new NotFoundException(
        'No products found matching your search criteria',
      );
    }

    // Map database entities to response DTOs
    const items = await Promise.all(
      products.map((product) => this.productMapper.mapToDto(product)),
    );

    // Create pagination metadata
    const meta: PaginationMeta = {
      currentPage: validPage,
      itemsPerPage: validLimit,
      totalItems,
      totalPages,
      hasNextPage: validPage < totalPages,
      hasPreviousPage: validPage > 1,
    };

    return { items, meta };
  }

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
