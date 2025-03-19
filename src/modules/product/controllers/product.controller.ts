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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProductService } from '../services/product.service';
import { ProductResponseDto } from '../dto/product-response.dto';
import { ProductFilterDto } from '../dto/product-filter.dto';
import {
  BaseResponse,
  PaginatedResponse,
} from '../../../config/swagger/response.schema';
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
import { ProductImageService } from '../services/product-image.service';
import { Public } from 'src/common/decorators';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly responseService: ResponseService,
    private readonly productImageService: ProductImageService,
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
}
