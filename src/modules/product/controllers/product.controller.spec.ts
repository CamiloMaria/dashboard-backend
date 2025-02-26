import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from '../services/product.service';
import { ProductFilterDto } from '../dto/product-filter.dto';
import { PaginationMeta } from '../../../config/swagger/response.schema';
import { ProductResponseDto } from '../dto/product-response.dto';

// Mock response data
const mockProduct = {
  id: 1,
  sku: '7460170355288',
  title: 'Test Product',
  price: 100.5,
  compare_price: 125.0,
  material: '123456',
  depto: 'electro',
  grupo: 'MU07',
  type_tax: 1,
  description_instaleap: '<div>Test</div>',
  category: 'Electronics',
  bigItems: 1,
  image_url: 'https://example.com/image.jpg',
  unit: 'UND',
  isActive: true,
  stock: 100,
  without_stock: 0,
  borrado_comment: null,
  shops_disable: [],
  userAdd: null,
  userUpd: 'admin',
  is_set: 0,
  security_stock: 10,
  brand: 'Test Brand',
  search_keywords: [],
  create_at: new Date(),
  update_at: new Date(),
  images: [],
  specifications: [],
  inventory: [],
} as ProductResponseDto;

const mockPaginationMeta: PaginationMeta = {
  currentPage: 1,
  itemsPerPage: 10,
  totalItems: 20,
  totalPages: 2,
  hasNextPage: true,
  hasPreviousPage: false,
};

// Mock service
const mockProductService = () => ({
  findAllPaginated: jest.fn(),
  findById: jest.fn(),
});

describe('ProductController', () => {
  let controller: ProductController;
  let service: ProductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useFactory: mockProductService,
        },
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    service = module.get<ProductService>(ProductService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated products with success response', async () => {
      // Arrange
      const filterDto: ProductFilterDto = {
        page: 1,
        limit: 10,
      };

      const serviceResponse = {
        items: [mockProduct, mockProduct],
        meta: mockPaginationMeta,
      };

      jest
        .spyOn(service, 'findAllPaginated')
        .mockResolvedValue(serviceResponse);

      // Act
      const result = await controller.findAll(filterDto);

      // Assert
      expect(service.findAllPaginated).toHaveBeenCalledWith(filterDto);
      expect(result).toEqual({
        success: true,
        message: 'Products retrieved successfully',
        data: serviceResponse.items,
        meta: serviceResponse.meta,
      });
    });

    it('should handle NotFoundException from service', async () => {
      // Arrange
      const filterDto: ProductFilterDto = {
        page: 1,
        limit: 10,
      };

      const error = new NotFoundException(
        'No products found matching your search criteria',
      );
      jest.spyOn(service, 'findAllPaginated').mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findAll(filterDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle generic errors with HttpException', async () => {
      // Arrange
      const filterDto: ProductFilterDto = {
        page: 1,
        limit: 10,
      };

      const error = new Error('Database connection error');
      jest.spyOn(service, 'findAllPaginated').mockRejectedValue(error);

      // Act
      try {
        await controller.findAll(filterDto);
        fail('Should have thrown an HttpException');
      } catch (e) {
        // Assert
        expect(e).toBeInstanceOf(HttpException);
        expect(e.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(e.getResponse()).toEqual({
          success: false,
          message: 'Database connection error',
          error: 'Database connection error',
        });
      }
    });
  });

  describe('findOne', () => {
    it('should return a single product with success response', async () => {
      // Arrange
      const productId = 1;
      jest.spyOn(service, 'findById').mockResolvedValue(mockProduct);

      // Act
      const result = await controller.findOne(productId);

      // Assert
      expect(service.findById).toHaveBeenCalledWith(productId);
      expect(result).toEqual({
        success: true,
        message: 'Product retrieved successfully',
        data: mockProduct,
      });
    });

    it('should handle NotFoundException from service', async () => {
      // Arrange
      const productId = 999;
      const error = new NotFoundException(
        `Product with ID ${productId} not found`,
      );
      jest.spyOn(service, 'findById').mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findOne(productId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle generic errors with HttpException', async () => {
      // Arrange
      const productId = 1;
      const error = new Error('Database connection error');
      jest.spyOn(service, 'findById').mockRejectedValue(error);

      // Act
      try {
        await controller.findOne(productId);
        fail('Should have thrown an HttpException');
      } catch (e) {
        // Assert
        expect(e).toBeInstanceOf(HttpException);
        expect(e.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(e.getResponse()).toEqual({
          success: false,
          message: 'Database connection error',
          error: 'Database connection error',
        });
      }
    });
  });
});
