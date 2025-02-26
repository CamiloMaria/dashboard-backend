import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductModule } from './product.module';
import { ProductService } from './services/product.service';
import { ProductMapper } from './mappers/product.mapper';
import { ProductResponseDto } from './dto/product-response.dto';
import { WebProduct } from './entities/shop/web-product.entity';
import { DatabaseConnection } from '../../config/database/constants';

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

describe('Product Module Integration Tests', () => {
  let app: INestApplication;
  let productService: ProductService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ProductModule],
    })
      .overrideProvider(
        TypeOrmModule.forFeature([WebProduct], DatabaseConnection.SHOP),
      )
      .useValue(mockRepository)
      .overrideProvider(ProductMapper)
      .useValue(mockMapper)
      .compile();

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
          num: 1,
          sku: '7460170355288',
          title: 'Test Product 1',
          borrado: false,
        },
        {
          num: 2,
          sku: '7460170355289',
          title: 'Test Product 2',
          borrado: false,
        },
      ];

      jest.spyOn(productService, 'findAllPaginated').mockResolvedValue({
        items: mockProducts.map(
          (p) =>
            ({
              id: p.num,
              sku: p.sku,
              title: p.title,
            }) as ProductResponseDto,
        ),
        meta: {
          currentPage: 1,
          itemsPerPage: 10,
          totalItems: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/products')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.totalItems).toBe(2);
    });

    it('should handle pagination query parameters', async () => {
      // Arrange
      jest.spyOn(productService, 'findAllPaginated').mockResolvedValue({
        items: [],
        meta: {
          currentPage: 2,
          itemsPerPage: 5,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: true,
        },
      });

      // Act & Assert
      await request(app.getHttpServer())
        .get('/products?page=2&limit=5')
        .expect(HttpStatus.OK);

      expect(productService.findAllPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 5,
        }),
      );
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
          hasNextPage: false,
          hasPreviousPage: false,
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
      jest
        .spyOn(productService, 'findAllPaginated')
        .mockRejectedValue(
          new Error('No products found matching your search criteria'),
        );

      // Act & Assert
      await request(app.getHttpServer())
        .get('/products?title=NonExistent')
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);
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
      jest
        .spyOn(productService, 'findById')
        .mockRejectedValue(new Error('Product with ID 999 not found'));

      // Act & Assert
      await request(app.getHttpServer())
        .get('/products/999')
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});
