import { Test, TestingModule } from '@nestjs/testing';
import {
  HttpException,
  HttpStatus,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import { ProductModule } from './product.module';
import { ProductService } from './services/product.service';
import { ProductMapper } from './mappers/product.mapper';
import { ProductResponseDto } from './dto/product-response.dto';
import { DatabaseConnection } from '../../config/database/constants';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  WebCatalog,
  WebProduct,
  WebProductGroup,
  WebProductImage,
  WebProductPromo,
  WebPromo,
} from './entities/shop';
import { PaginationMeta } from '../../config/swagger/response.schema';

// Mock repositories
const mockRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
};

// Mock mapper
const mockMapper = {
  mapToDto: jest.fn().mockImplementation((product) => {
    return {
      id: product.num,
      sku: product.sku,
      title: product.title,
      // ... map other properties
    } as ProductResponseDto;
  }),
};

// Helper function to create a testing module with all repositories mocked
function createTestingModule() {
  return Test.createTestingModule({
    imports: [ProductModule],
  })
    .overrideProvider(ProductMapper)
    .useValue(mockMapper)
    .overrideProvider(getRepositoryToken(WebProduct, DatabaseConnection.SHOP))
    .useValue(mockRepository)
    .overrideProvider(
      getRepositoryToken(WebProductImage, DatabaseConnection.SHOP),
    )
    .useValue(mockRepository)
    .overrideProvider(
      getRepositoryToken(WebProductGroup, DatabaseConnection.SHOP),
    )
    .useValue(mockRepository)
    .overrideProvider(getRepositoryToken(WebCatalog, DatabaseConnection.SHOP))
    .useValue(mockRepository)
    .overrideProvider(getRepositoryToken(WebPromo, DatabaseConnection.SHOP))
    .useValue(mockRepository)
    .overrideProvider(
      getRepositoryToken(WebProductPromo, DatabaseConnection.SHOP),
    )
    .useValue(mockRepository);
}

describe('Product Module Integration Tests', () => {
  let app: INestApplication;
  let productService: ProductService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await createTestingModule().compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    productService = moduleFixture.get<ProductService>(ProductService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /products', () => {
    it('should return paginated products', async () => {
      // Arrange
      const mockProducts = [
        {
          id: 1,
          sku: '7460170355288',
          title: 'Test Product',
        },
      ] as ProductResponseDto[];

      const mockMeta: PaginationMeta = {
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 1,
        totalPages: 1,
      };

      const mockPaginatedResponse = {
        items: mockProducts,
        meta: mockMeta,
      };

      jest
        .spyOn(productService, 'findAllPaginated')
        .mockResolvedValue(mockPaginatedResponse);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/products')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.currentPage).toBe(1);
      expect(response.body.meta.itemsPerPage).toBe(10);
    });

    it('should handle search parameters', async () => {
      // Arrange
      jest.spyOn(productService, 'findAllPaginated').mockResolvedValue({
        items: [],
        meta: {
          currentPage: 1,
          itemsPerPage: 10,
          totalItems: 0,
          totalPages: 0,
        },
      });

      // Act & Assert
      await request(app.getHttpServer())
        .get('/products?title=Test&sku=123456&matnr=ABC123')
        .expect(HttpStatus.OK);

      expect(productService.findAllPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test',
          sku: '123456',
          matnr: 'ABC123',
        }),
      );
    });

    it('should handle 404 when no products found', async () => {
      // Arrange
      const errorResponse = {
        success: false,
        message: 'No products found matching your search criteria',
        error: 'NOT_FOUND',
      };

      jest
        .spyOn(productService, 'findAllPaginated')
        .mockRejectedValue(
          new HttpException(errorResponse, HttpStatus.NOT_FOUND),
        );

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/products?title=NonExistent')
        .expect(HttpStatus.NOT_FOUND);

      expect(response.body).toMatchObject(errorResponse);
    });
  });

  describe('GET /products/:id', () => {
    it('should return a product by ID', async () => {
      // Arrange
      const mockProduct = {
        id: 1,
        sku: '7460170355288',
        title: 'Test Product',
      } as ProductResponseDto;

      jest.spyOn(productService, 'findById').mockResolvedValue(mockProduct);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/products/1')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
      expect(response.body.data.sku).toBe('7460170355288');
    });

    it('should handle 404 when product not found', async () => {
      // Arrange
      const errorResponse = {
        success: false,
        message: 'Product with ID 999 not found',
        error: 'NOT_FOUND',
      };

      jest
        .spyOn(productService, 'findById')
        .mockRejectedValue(
          new HttpException(errorResponse, HttpStatus.NOT_FOUND),
        );

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/products/999')
        .expect(HttpStatus.NOT_FOUND);

      expect(response.body).toMatchObject(errorResponse);
    });

    it('should handle internal server errors', async () => {
      // Arrange
      const errorResponse = {
        success: false,
        message: 'Failed to retrieve product with ID 1',
        error: 'Database connection error',
      };

      jest
        .spyOn(productService, 'findById')
        .mockRejectedValue(
          new HttpException(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR),
        );

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/products/1')
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(response.body).toMatchObject(errorResponse);
    });
  });
});
