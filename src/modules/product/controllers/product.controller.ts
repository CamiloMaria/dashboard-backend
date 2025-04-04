import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  HttpException,
  HttpStatus,
  Query,
  Request,
  HttpCode,
  Patch,
  Delete,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiCookieAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductService } from '../services/product.service';
import { ProductResponseDto } from '../dto/product-response.dto';
import { ProductFilterDto } from '../dto/product-filter.dto';
import {
  BaseResponse,
  PaginatedResponse,
} from '../../../common/schemas/response.schema';
import { ResponseService } from '../../../common/services/response.service';
import {
  GenerateDescriptionDto,
  GenerateDescriptionResponseDto,
} from '../dto/generate-description.dto';
import {
  GenerateKeywordsDto,
  GenerateKeywordsResponseDto,
} from '../dto/generate-keywords.dto';
import {
  CreateProductsDto,
  CreateProductResultDto,
} from '../dto/create-product.dto';
import { RequestWithUser } from '../../../common/interfaces/request.interface';
import { Public } from 'src/common/decorators';
import { ProductPatchDto } from '../dto/product-update.dto';
import { ProductDeleteDto } from '../dto/product-delete.dto';
import { AtomicProductUpdateDto } from '../dto/atomic-product-update.dto';
import { LoggerService } from 'src/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebProduct } from '../entities/shop/web-product.entity';
import { DatabaseConnection } from 'src/config/database/constants';
import { RequirePages } from 'src/common';

@ApiTags('Products')
@ApiCookieAuth()
@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly responseService: ResponseService,
    private readonly logger: LoggerService,
    @InjectRepository(WebProduct, DatabaseConnection.SHOP)
    private readonly webProductRepository: Repository<WebProduct>,
  ) {}

  @Get('health')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  health() {
    return;
  }

  @Get()
  @RequirePages('/products')
  @ApiOperation({
    summary: 'Get all products with pagination, search, and sorting',
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    type: PaginatedResponse<ProductResponseDto>,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'No products found',
    type: BaseResponse<null>,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: BaseResponse<null>,
  })
  async findAll(@Query() filterDto: ProductFilterDto) {
    try {
      const { items, meta } =
        await this.productService.findAllPaginated(filterDto);
      return this.responseService.paginate(
        items,
        meta.totalItems,
        meta.currentPage,
        meta.itemsPerPage,
        'Products retrieved successfully',
        {
          statusCode: HttpStatus.OK,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to retrieve products',
          error: error.message,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @RequirePages('/products')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiParam({ name: 'id', description: 'Product ID', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Product retrieved successfully',
    type: BaseResponse<ProductResponseDto>,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
    type: BaseResponse<null>,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: BaseResponse<null>,
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      const product = await this.productService.findById(id);
      return this.responseService.success(
        product,
        'Product retrieved successfully',
        {
          statusCode: HttpStatus.OK,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to retrieve product',
          error: error.message,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('generate-description')
  @RequirePages('/product/$productId')
  @ApiOperation({
    summary: 'Generate a product description using ChatGPT',
  })
  @ApiBody({ type: GenerateDescriptionDto })
  @ApiResponse({
    status: 200,
    description: 'Description generated successfully',
    type: BaseResponse<GenerateDescriptionResponseDto>,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request or AI generation error',
    type: BaseResponse<null>,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: BaseResponse<null>,
  })
  async generateDescription(@Body() generateDto: GenerateDescriptionDto) {
    try {
      const description = await this.productService.generateDescription(
        generateDto.productTitle,
      );

      return this.responseService.success(
        { description },
        'Product description generated successfully',
        {
          statusCode: HttpStatus.OK,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to generate product description',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('generate-keywords')
  @RequirePages('/product/$productId')
  @ApiOperation({
    summary: 'Generate SEO keywords for a product using ChatGPT',
  })
  @ApiBody({ type: GenerateKeywordsDto })
  @ApiResponse({
    status: 200,
    description: 'Keywords generated successfully',
    type: BaseResponse<GenerateKeywordsResponseDto>,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request or AI generation error',
    type: BaseResponse<null>,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: BaseResponse<null>,
  })
  async generateKeywords(@Body() generateDto: GenerateKeywordsDto) {
    try {
      const keywords = await this.productService.generateKeywords(generateDto);

      return this.responseService.success(
        { keywords },
        'Product keywords generated successfully',
        {
          statusCode: HttpStatus.OK,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to generate product keywords',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('generate-keywords-all')
  @RequirePages('/product/$productId')
  @ApiOperation({
    summary: 'Generate keywords for all products without existing keywords',
    description:
      'Processes all products in batches and generates keywords using AI with optimized performance',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        batchSize: {
          type: 'number',
          description: 'Number of products to process in each batch',
          default: 20,
        },
        concurrencyLevel: {
          type: 'number',
          description:
            'Maximum number of concurrent product processing operations',
          default: 5,
        },
        prioritizeCategories: {
          type: 'array',
          items: {
            type: 'string',
          },
          description:
            'List of product categories to prioritize for processing',
        },
      },
    },
  })
  @ApiResponse({
    status: 202,
    description: 'Keyword generation task started',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/BaseResponse' },
        {
          properties: {
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                totalProducts: { type: 'number' },
                options: {
                  type: 'object',
                  properties: {
                    batchSize: { type: 'number' },
                    concurrencyLevel: { type: 'number' },
                    prioritizeCategories: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Task already running',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: BaseResponse,
  })
  async generateKeywordsForAllProducts(
    @Body()
    options: {
      batchSize?: number;
      concurrencyLevel?: number;
      prioritizeCategories?: string[];
    },
    @Request() req: RequestWithUser,
  ) {
    try {
      // Get the authenticated user from the request
      const username = req.user?.username || 'system';

      // Validate and set defaults for options
      const validatedOptions = {
        batchSize:
          options.batchSize && options.batchSize > 0
            ? Math.min(options.batchSize, 50)
            : 20,
        concurrencyLevel:
          options.concurrencyLevel && options.concurrencyLevel > 0
            ? Math.min(options.concurrencyLevel, 10)
            : 5,
        prioritizeCategories: options.prioritizeCategories || [],
      };

      // Get current status to check if a task is already running
      const currentStatus = this.productService.getKeywordGenerationStatus();
      if (currentStatus.isRunning) {
        throw new HttpException(
          {
            success: false,
            message: 'A keyword generation task is already running',
            currentStatus,
          },
          HttpStatus.CONFLICT,
        );
      }

      // Start the process asynchronously
      // We don't await here because we want to return a response immediately
      this.productService
        .generateKeywordsForAllProducts(validatedOptions, username)
        .then((result) => {
          this.logger.log(
            `Keyword generation task completed. Processed ${result.processedProducts} products. Success: ${result.successCount}, Failed: ${result.failedProducts.length}`,
            ProductController.name,
          );
        })
        .catch((error) => {
          this.logger.error(
            `Keyword generation task failed: ${error.message}`,
            error.stack,
            ProductController.name,
          );
        });

      // Count products that need processing
      const query = this.webProductRepository
        .createQueryBuilder('product')
        .where('product.borrado = :borrado', { borrado: false })
        .andWhere(
          "(product.search_keywords IS NULL OR product.search_keywords = '')",
        );

      let prioritizedCount = 0;
      if (validatedOptions.prioritizeCategories.length > 0) {
        prioritizedCount = await this.webProductRepository
          .createQueryBuilder('product')
          .where('product.borrado = :borrado', { borrado: false })
          .andWhere(
            "(product.search_keywords IS NULL OR product.search_keywords = '')",
          )
          .andWhere('product.grupo IN (:...categories)', {
            categories: validatedOptions.prioritizeCategories,
          })
          .getCount();
      }

      const totalProducts = await query.getCount();

      return this.responseService.success(
        {
          message: `Optimized keyword generation task started`,
          totalProducts,
          prioritizedProducts:
            prioritizedCount > 0 ? prioritizedCount : undefined,
          options: validatedOptions,
        },
        'Keyword generation process initiated successfully',
        {
          statusCode: HttpStatus.ACCEPTED,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: 'Failed to start keyword generation task',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('generate-keywords-pause')
  @RequirePages('/product/$productId')
  @ApiOperation({
    summary: 'Pause a running keyword generation task',
    description:
      'Requests the current running task to pause after completing the current batch',
  })
  @ApiResponse({
    status: 200,
    description: 'Pause request processed',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/BaseResponse' },
        {
          properties: {
            data: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
              },
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'No task running',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: BaseResponse,
  })
  async pauseKeywordGeneration() {
    try {
      const result = this.productService.pauseKeywordGeneration();

      if (!result.success) {
        return this.responseService.error(result.message, 'BAD_REQUEST', {
          statusCode: HttpStatus.BAD_REQUEST,
          timestamp: new Date().toISOString(),
        });
      }

      return this.responseService.success(
        result,
        'Keyword generation pause request processed',
        {
          statusCode: HttpStatus.OK,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to pause keyword generation',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('generate-keywords-resume')
  @RequirePages('/product/$productId')
  @ApiOperation({
    summary: 'Resume a paused keyword generation task',
    description: 'Resumes a previously paused keyword generation task',
  })
  @ApiResponse({
    status: 200,
    description: 'Resume request processed',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/BaseResponse' },
        {
          properties: {
            data: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
              },
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'No task paused',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: BaseResponse,
  })
  async resumeKeywordGeneration() {
    try {
      const result = this.productService.resumeKeywordGeneration();

      if (!result.success) {
        return this.responseService.error(result.message, 'BAD_REQUEST', {
          statusCode: HttpStatus.BAD_REQUEST,
          timestamp: new Date().toISOString(),
        });
      }

      return this.responseService.success(
        result,
        'Keyword generation resume request processed',
        {
          statusCode: HttpStatus.OK,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to resume keyword generation',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('generate-keywords-status')
  @RequirePages('/product/$productId')
  @ApiOperation({
    summary: 'Get the current status of the keyword generation task',
    description:
      'Returns detailed information about the progress of the keyword generation task',
  })
  @ApiResponse({
    status: 200,
    description: 'Status retrieved successfully',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/BaseResponse' },
        {
          properties: {
            data: {
              type: 'object',
              properties: {
                isRunning: { type: 'boolean' },
                isPaused: { type: 'boolean', nullable: true },
                progress: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    startTime: { type: 'string', format: 'date-time' },
                    endTime: {
                      type: 'string',
                      format: 'date-time',
                      nullable: true,
                    },
                    totalProducts: { type: 'number' },
                    processedProducts: { type: 'number' },
                    successCount: { type: 'number' },
                    failedCount: { type: 'number' },
                    percentComplete: { type: 'number' },
                    lastProcessedSku: { type: 'string', nullable: true },
                    batchSize: { type: 'number' },
                    concurrencyLevel: { type: 'number', nullable: true },
                    estimatedTimeRemaining: { type: 'string', nullable: true },
                    cacheStats: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        productCacheSize: { type: 'number' },
                        categoryCacheSize: { type: 'number' },
                        pendingTasksCount: { type: 'number' },
                      },
                    },
                    performance: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        averageResponseTime: { type: 'number' },
                        consecutiveErrors: { type: 'number' },
                        lastErrorTime: {
                          type: 'string',
                          format: 'date-time',
                          nullable: true,
                        },
                        adaptiveDelayMs: { type: 'number' },
                        processingRate: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: BaseResponse,
  })
  async getKeywordGenerationStatus() {
    try {
      const status = this.productService.getKeywordGenerationStatus();

      // Add isPaused property
      const response = {
        ...status,
        isPaused: status.isRunning
          ? this.productService['pauseRequested']
          : null,
      };

      return this.responseService.success(
        response,
        'Keyword generation status retrieved successfully',
        {
          statusCode: HttpStatus.OK,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve keyword generation status',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('generate-keywords-stats')
  @RequirePages('/product/$productId')
  @ApiOperation({
    summary: 'Get detailed statistics about the keyword generation process',
    description: 'Returns information about the keyword generation performance',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/BaseResponse' },
        {
          properties: {
            data: {
              type: 'object',
              properties: {
                pendingTasksCount: { type: 'number' },
                performanceStats: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    averageResponseTime: { type: 'number' },
                    consecutiveErrors: { type: 'number' },
                    adaptiveDelayMs: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: BaseResponse,
  })
  async getKeywordGenerationStats() {
    try {
      // Get current status
      const status = this.productService.getKeywordGenerationStatus();

      // Extract relevant performance information
      const pendingTasksCount =
        this.productService['pendingKeywordTasks']?.size || 0;
      const performanceStats = status.progress?.performance
        ? {
            averageResponseTime:
              status.progress.performance.averageResponseTime,
            consecutiveErrors: status.progress.performance.consecutiveErrors,
            adaptiveDelayMs: status.progress.performance.adaptiveDelayMs,
          }
        : null;

      return this.responseService.success(
        {
          pendingTasksCount,
          performanceStats,
          isRunning: status.isRunning,
          isPaused: status.isRunning
            ? this.productService['pauseRequested']
            : null,
        },
        'Keyword generation statistics retrieved successfully',
        {
          statusCode: HttpStatus.OK,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve keyword generation statistics',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @RequirePages('/products/new')
  @ApiOperation({
    summary: 'Create products from a list of SKUs',
    description:
      'Create new products by providing an array of SKUs. Checks if each product exists before creating.',
  })
  @ApiBody({ type: CreateProductsDto })
  @ApiResponse({
    status: 201,
    description: 'Products processed successfully',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/BaseResponse' },
        {
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  sku: { type: 'string' },
                  success: { type: 'boolean' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: BaseResponse,
  })
  async createFromSkus(
    @Body() createDto: CreateProductsDto,
    @Request() req: RequestWithUser,
  ): Promise<BaseResponse<CreateProductResultDto[]>> {
    try {
      // Get the authenticated user from the request
      const username = req.user?.username || 'system';

      const results = await this.productService.createProductsFromSkus(
        createDto.skus,
        username,
      );

      // Check if any products were successfully created
      const hasSuccesses = results.some((result) => result.success);

      return this.responseService.success<CreateProductResultDto[]>(
        results,
        hasSuccesses
          ? 'Products processed successfully'
          : 'No products were created',
        {
          statusCode: hasSuccesses ? HttpStatus.CREATED : HttpStatus.OK,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to process products',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @RequirePages('/product/$productId')
  @ApiOperation({ summary: 'Update a product and/or its catalogs' })
  @ApiParam({ name: 'id', description: 'Product ID', type: 'number' })
  @ApiBody({ type: ProductPatchDto })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
    type: BaseResponse<ProductResponseDto>,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
    type: BaseResponse<null>,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
    type: BaseResponse<null>,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: BaseResponse<null>,
  })
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: ProductPatchDto,
    @Request() req: RequestWithUser,
  ) {
    try {
      // Get the authenticated user from the request
      const username = req.user?.username || 'system';

      return;
      const updatedProduct = await this.productService.updateProduct(
        id,
        updateDto,
        username,
      );

      return this.responseService.success(
        updatedProduct,
        'Product updated successfully',
        {
          statusCode: HttpStatus.OK,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to update product',
          error: error.message,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @RequirePages('/product/$productId')
  @ApiOperation({ summary: 'Delete a product and its related data' })
  @ApiParam({ name: 'id', description: 'Product ID', type: 'number' })
  @ApiBody({ type: ProductDeleteDto })
  @ApiResponse({
    status: 200,
    description: 'Product deleted successfully',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/BaseResponse' },
        {
          properties: {
            data: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
              },
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
    type: BaseResponse<null>,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: BaseResponse<null>,
  })
  async deleteProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() deleteDto: ProductDeleteDto,
    @Request() req: RequestWithUser,
  ) {
    try {
      // Get the authenticated user from the request
      const username = req.user?.username || 'system';

      const result = await this.productService.deleteProduct(
        id,
        deleteDto.comment,
        username,
      );

      return this.responseService.success(
        result,
        'Product deletion processed',
        {
          statusCode: HttpStatus.OK,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to delete product',
          error: error.message,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('atomic-update')
  @RequirePages('/product/$productId')
  @ApiOperation({
    summary: 'Update a product and its images in a single transaction',
    description:
      'Process multiple operations in a single atomic transaction: update product metadata, delete images, reorder images, and upload new images. When uploading images without position information in the filename (format: position_X_filename.jpg), positions will be automatically assigned based on the next available position.',
  })
  @UseInterceptors(FilesInterceptor('files'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'string',
          description: 'JSON string containing the operations to perform',
        },
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Image files to upload (if any)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Product and images updated successfully',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request or invalid data',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: BaseResponse,
  })
  async atomicProductUpdate(
    @Body('data') dataString: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req: RequestWithUser,
  ) {
    try {
      // Parse the JSON data
      const data: AtomicProductUpdateDto = JSON.parse(dataString);

      // Get the authenticated user
      const username = req.user?.username || 'system';

      // Get product ID from the data
      if (!data.sku) {
        throw new HttpException(
          {
            success: false,
            message: 'Product SKU is required',
            error: 'MISSING_PRODUCT_IDENTIFIER',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Process the atomic update
      const result = await this.productService.atomicProductUpdate(
        data.sku,
        {
          product: data.metadata,
          images: {
            delete: data.imagesToDelete,
            reorder: data.imagesToReorder,
            // Process files based on their fieldname to identify their position
            add: files?.map((file) => {
              // Extract position from the filename, default to null if not specified
              // Positions will be auto-assigned in the service for files with null position
              const positionMatch =
                file.originalname.match(/position[_-]?(\d+)/i);
              const position = positionMatch
                ? parseInt(positionMatch[1], 10)
                : null;
              return { position, file };
            }),
          },
        },
        username,
      );

      return this.responseService.success(
        result,
        'Product updated successfully',
        {
          statusCode: HttpStatus.OK,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      if (error instanceof SyntaxError) {
        // Handle JSON parsing error
        throw new HttpException(
          {
            success: false,
            message: 'Invalid JSON data provided',
            error: error.message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to process product update',
          error: error.message,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
