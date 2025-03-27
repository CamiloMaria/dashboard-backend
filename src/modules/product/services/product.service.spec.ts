import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductMapper } from '../mappers/product.mapper';
import { WebProduct } from '../entities/shop/web-product.entity';
import { DatabaseConnection } from '../../../config/database/constants';
import { ProductFilterDto } from '../dto/product-filter.dto';
import { ProductResponseDto } from '../dto/product-response.dto';

// Mock data
const mockProduct = {
  num: 1,
  sku: '7460170355288',
  title: 'Test Product',
  matnr: '123456',
  images: [],
  catalogs: [],
  borrado: false,
} as WebProduct;

const mockResponseDto = {
  id: 1,
  sku: '7460170355288',
  title: 'Test Product',
  material: '123456',
  images: [],
  catalogs: [],
} as ProductResponseDto;

// Mock repository
const mockProductRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
});

// Mock mapper
const mockProductMapper = () => ({
  mapToDto: jest.fn().mockResolvedValue(mockResponseDto),
});

describe('ProductService', () => {
  let service: ProductService;
  let repository: Repository<WebProduct>;
  let mapper: ProductMapper;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getRepositoryToken(WebProduct, DatabaseConnection.SHOP),
          useFactory: mockProductRepository,
        },
        {
          provide: ProductMapper,
          useFactory: mockProductMapper,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    repository = module.get<Repository<WebProduct>>(
      getRepositoryToken(WebProduct, DatabaseConnection.SHOP),
    );
    mapper = module.get<ProductMapper>(ProductMapper);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllPaginated', () => {
    it('should return paginated products with metadata', async () => {
      // Arrange
      const filterDto: ProductFilterDto = {
        page: 1,
        limit: 10,
      };

      jest.spyOn(repository, 'count').mockResolvedValue(20);
      jest
        .spyOn(repository, 'find')
        .mockResolvedValue([mockProduct, mockProduct]);

      // Act
      const result = await service.findAllPaginated(filterDto);

      // Assert
      expect(repository.count).toHaveBeenCalled();
      expect(repository.find).toHaveBeenCalled();
      expect(mapper.mapToDto).toHaveBeenCalledTimes(2);

      expect(result.items).toHaveLength(2);
      expect(result.meta).toEqual({
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 20,
        totalPages: 2,
        hasNextPage: true,
        hasPreviousPage: false,
      });
    });

    it('should apply search filters correctly', async () => {
      // Arrange
      const filterDto: ProductFilterDto = {
        page: 1,
        limit: 10,
        sku: '7460170355288',
        title: 'Product',
        matnr: '123456',
      };

      jest.spyOn(repository, 'count').mockResolvedValue(1);
      jest.spyOn(repository, 'find').mockResolvedValue([mockProduct]);

      // Act
      await service.findAllPaginated(filterDto);

      // Assert
      expect(repository.count).toHaveBeenCalledWith({
        where: {
          sku: '7460170355288',
          title: expect.any(Object), // Like condition
          matnr: '123456',
        },
      });
    });

    it('should throw HttpException when no products are found', async () => {
      // Arrange
      const filterDto: ProductFilterDto = { page: 1, limit: 10 };

      jest.spyOn(repository, 'count').mockResolvedValue(0);
      jest.spyOn(repository, 'find').mockResolvedValue([]);

      // Act & Assert
      try {
        await service.findAllPaginated(filterDto);
        fail('should have thrown HttpException');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect(error.getResponse()).toEqual({
          success: false,
          message: 'No products found matching your search criteria',
          error: 'NOT_FOUND',
        });
      }
    });

    it('should wrap database errors in HttpException', async () => {
      // Arrange
      const filterDto: ProductFilterDto = { page: 1, limit: 10 };
      const dbError = new Error('Database connection error');

      jest.spyOn(repository, 'count').mockRejectedValue(dbError);

      // Act & Assert
      try {
        await service.findAllPaginated(filterDto);
        fail('should have thrown HttpException');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(error.getResponse()).toEqual({
          success: false,
          message: 'Failed to retrieve products',
          error: 'Database connection error',
          meta: { details: expect.any(String) },
        });
      }
    });
  });

  describe('findById', () => {
    it('should return a product by ID', async () => {
      // Arrange
      const productId = 1;
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockProduct);

      // Act
      const result = await service.findById(productId);

      // Assert
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { num: productId, borrado: false },
        relations: ['images', 'catalogs'],
      });
      expect(mapper.mapToDto).toHaveBeenCalledWith(mockProduct);
      expect(result).toEqual(mockResponseDto);
    });

    it('should throw HttpException when product is not found', async () => {
      // Arrange
      const productId = 999;
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      try {
        await service.findById(productId);
        fail('should have thrown HttpException');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect(error.getResponse()).toEqual({
          success: false,
          message: `Product with ID ${productId} not found`,
          error: 'NOT_FOUND',
        });
      }
    });

    it('should wrap database errors in HttpException', async () => {
      // Arrange
      const productId = 1;
      const dbError = new Error('Database connection error');
      jest.spyOn(repository, 'findOne').mockRejectedValue(dbError);

      // Act & Assert
      try {
        await service.findById(productId);
        fail('should have thrown HttpException');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(error.getResponse()).toEqual({
          success: false,
          message: `Failed to retrieve product with ID ${productId}`,
          error: 'Database connection error',
        });
      }
    });
  });

  describe('findAll', () => {
    it('should return all products', async () => {
      // Arrange
      jest
        .spyOn(repository, 'find')
        .mockResolvedValue([mockProduct, mockProduct]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(repository.find).toHaveBeenCalledWith({
        where: { borrado: false },
        relations: ['images', 'catalogs'],
        take: 10,
      });
      expect(mapper.mapToDto).toHaveBeenCalledTimes(2);
      expect(result).toEqual([mockResponseDto, mockResponseDto]);
    });

    it('should throw HttpException when no products are found', async () => {
      // Arrange
      jest.spyOn(repository, 'find').mockResolvedValue([]);

      // Act & Assert
      try {
        await service.findAll();
        fail('should have thrown HttpException');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect(error.getResponse()).toEqual({
          success: false,
          message: 'No products found',
          error: 'NOT_FOUND',
        });
      }
    });
  });
});
