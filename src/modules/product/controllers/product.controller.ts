import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  HttpException,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProductService } from '../services/product.service';
import { ProductResponseDto } from '../dto/product-response.dto';
import { ProductFilterDto } from '../dto/product-filter.dto';
import {
  BaseResponse,
  PaginatedResponse,
} from '../../../config/swagger/response.schema';
import { ResponseService } from '../../../common/services/response.service';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly responseService: ResponseService,
  ) {}

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
    status: 404,
    description: 'No products found',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: BaseResponse,
  })
  async findAll(@Query() filterDto: ProductFilterDto) {
    try {
      const { items, meta } =
        await this.productService.findAllPaginated(filterDto);
      return this.responseService.paginate(
        items,
        meta.total,
        meta.page,
        meta.limit,
        'Products retrieved successfully',
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
    type: () => BaseResponse<ProductResponseDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
    type: () => BaseResponse<null>,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: () => BaseResponse<null>,
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      const product = await this.productService.findById(id);
      return this.responseService.success(
        product,
        'Product retrieved successfully',
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
}
