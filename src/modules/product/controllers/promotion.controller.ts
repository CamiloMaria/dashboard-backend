import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PromotionService } from '../services/promotion.service';
import { PromotionResponseDto } from '../dto/promotion-response.dto';
import { PromotionFilterDto } from '../dto/promotion-filter.dto';
import {
  BaseResponse,
  PaginatedResponse,
} from '../../../config/swagger/response.schema';
import { ResponseService } from '../../../common/services/response.service';

@ApiTags('Promotions')
@ApiBearerAuth()
@Controller('promotions')
export class PromotionController {
  constructor(
    private readonly promotionService: PromotionService,
    private readonly responseService: ResponseService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get all product promotions with pagination, search, and sorting',
  })
  @ApiResponse({
    status: 200,
    description: 'Promotions retrieved successfully',
    type: () => PaginatedResponse<PromotionResponseDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'No promotions found',
    type: () => BaseResponse<null>,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: () => BaseResponse<null>,
  })
  async findAll(@Query() filterDto: PromotionFilterDto) {
    try {
      const { items, meta } =
        await this.promotionService.findAllPaginated(filterDto);
      return this.responseService.paginate(
        items,
        meta.totalItems,
        meta.currentPage,
        meta.itemsPerPage,
        'Promotions retrieved successfully',
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
          message: error.message || 'Failed to retrieve promotions',
          error: error.message,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a promotion by ID' })
  @ApiParam({ name: 'id', description: 'Promotion ID', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Promotion retrieved successfully',
    type: () => BaseResponse<PromotionResponseDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'Promotion not found',
    type: () => BaseResponse<null>,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: () => BaseResponse<null>,
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      const promotion = await this.promotionService.findById(id);
      return this.responseService.success(
        promotion,
        'Promotion retrieved successfully',
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
          message: error.message || 'Failed to retrieve promotion',
          error: error.message,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
