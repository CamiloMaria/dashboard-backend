import {
  Controller,
  Get,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProductSetService } from '../services/product-set.service';
import { ProductSetResponseDto } from '../dto/product-set-response.dto';
import { ProductSetFilterDto } from '../dto/product-set-filter.dto';
import {
  BaseResponse,
  PaginatedResponse,
} from '../../../config/swagger/response.schema';
import { ResponseService } from '../../../common/services/response.service';

@ApiTags('Product Sets')
@Controller('product-sets')
export class ProductSetController {
  constructor(
    private readonly productSetService: ProductSetService,
    private readonly responseService: ResponseService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get all product sets with pagination, search, and sorting',
  })
  @ApiResponse({
    status: 200,
    description: 'Product sets retrieved successfully',
    type: () => PaginatedResponse<ProductSetResponseDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'No product sets found',
    type: () => BaseResponse<null>,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: () => BaseResponse<null>,
  })
  async findAll(@Query() filterDto: ProductSetFilterDto) {
    try {
      const { items, meta } =
        await this.productSetService.findAllPaginated(filterDto);
      return this.responseService.paginate(
        items,
        meta.totalItems,
        meta.currentPage,
        meta.itemsPerPage,
        'Product sets retrieved successfully',
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to retrieve product sets',
          error: error.message,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':sku')
  @ApiOperation({ summary: 'Get a product set by SKU' })
  @ApiParam({ name: 'sku', description: 'Product Set SKU', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Product set retrieved successfully',
    type: () => BaseResponse<ProductSetResponseDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'Product set not found',
    type: () => BaseResponse<null>,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: () => BaseResponse<null>,
  })
  async findOne(@Param('sku') sku: string) {
    try {
      const productSet = await this.productSetService.findBySku(sku);
      return this.responseService.success(
        productSet,
        'Product set retrieved successfully',
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to retrieve product set',
          error: error.message,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
