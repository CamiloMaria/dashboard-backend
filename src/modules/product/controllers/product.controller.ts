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

@ApiTags('Products')
@ApiCookieAuth()
@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly responseService: ResponseService,
  ) {}

  @Get('health')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  health() {
    return;
  }

  @Get()
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

  @Post()
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
  @ApiOperation({
    summary: 'Update a product and its images in a single transaction',
    description:
      'Process multiple operations in a single atomic transaction: update product metadata, delete images, reorder images, and upload new images.',
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
            reorder: data.imagesToReorder?.map((item) => ({
              currentPosition: item.currentPosition,
              newPosition: item.newPosition,
            })),
            // Process files based on their fieldname to identify their position
            add: files?.map((file) => {
              // Extract position from the filename, default to the end if not specified
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
