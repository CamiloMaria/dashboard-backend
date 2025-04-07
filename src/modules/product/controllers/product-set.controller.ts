import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
  Post,
  Body,
  Request,
  HttpCode,
  Delete,
  Param,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { ProductSetService } from '../services/product-set.service';
import { ProductSetResponseDto } from '../dto/product-set-response.dto';
import { ProductSetFilterDto } from '../dto/product-set-filter.dto';
import {
  BaseResponse,
  PaginatedResponse,
} from '../../../common/schemas/response.schema';
import { ResponseService } from '../../../common/services/response.service';
import {
  CreateProductSetDto,
  CreateProductSetResultDto,
} from '../dto/create-product-set.dto';
import { RequestWithUser } from 'src/common/interfaces/request.interface';
import { Public } from 'src/common/decorators';
import { ProductSetDeleteDto } from '../dto/product-set-delete.dto';
import { RequirePages } from 'src/common';
import { ProductSetStatusDto } from '../dto';

@ApiTags('Products Sets')
@Controller('product-sets')
export class ProductSetController {
  constructor(
    private readonly productSetService: ProductSetService,
    private readonly responseService: ResponseService,
  ) {}

  @Get('health')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  health() {
    return;
  }

  @Get()
  @RequirePages('/product-sets')
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Get all product sets with pagination, search, and sorting',
  })
  @ApiResponse({
    status: 200,
    description: 'Product sets retrieved successfully',
    type: () => PaginatedResponse<ProductSetResponseDto[]>,
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
      const { items, pagination } =
        await this.productSetService.findAllPaginated(filterDto);
      return this.responseService.paginate(
        items,
        pagination.totalItems,
        pagination.currentPage,
        pagination.itemsPerPage,
        'Product sets retrieved successfully',
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
          message: error.message || 'Failed to retrieve product sets',
          error: error.message,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @RequirePages('/product-sets')
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Create a product set (bundle)',
    description:
      'Create a product set by combining multiple products. Validates products exist, have images, and belong to the same group.',
  })
  @ApiBody({ type: CreateProductSetDto })
  @ApiResponse({
    status: 201,
    description: 'Product set created successfully',
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
                status: { type: 'string' },
                setId: { type: 'number' },
                setTitle: { type: 'string' },
                totalPrice: { type: 'number' },
                productCount: { type: 'number' },
              },
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or cannot create set',
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
  async createProductSet(
    @Body() createSetDto: CreateProductSetDto,
    @Request() req: RequestWithUser,
  ): Promise<BaseResponse<CreateProductSetResultDto>> {
    try {
      // Get the authenticated user from the request
      const username = req.user?.username || 'system';

      const result = await this.productSetService.createProductSet(
        createSetDto,
        username,
      );

      return this.responseService.success<CreateProductSetResultDto>(
        result,
        result.success
          ? 'Product set created successfully'
          : 'Failed to create product set',
        {
          statusCode: result.success
            ? HttpStatus.CREATED
            : HttpStatus.BAD_REQUEST,
          timestamp: new Date().toISOString(),
          path: req.url,
        },
      );
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to create product set',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':setId/status')
  @RequirePages('/product-sets')
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Update the status of a product set',
    description:
      'Update the status of a product set to either active or inactive',
  })
  @ApiParam({
    name: 'setId',
    description: 'The ID of the product set to update',
    type: 'string',
    example: '123',
  })
  @ApiBody({ type: ProductSetStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Product set status updated successfully',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Product set not found',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: BaseResponse,
  })
  async updateProductSetStatus(
    @Param('setId') setId: string,
    @Body() updateDto: ProductSetStatusDto,
    @Request() req: RequestWithUser,
  ) {
    try {
      const username = req.user?.username || 'system';

      const result = await this.productSetService.updateProductSetStatus(
        setId,
        updateDto.status,
        username,
      );

      return this.responseService.success(
        result,
        'Product set status updated successfully',
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
          message: 'Failed to update product set status',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':setSku')
  @RequirePages('/product-sets')
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Delete a product set',
    description:
      'Delete a product set by its SKU. This will remove the set and reactivate its component products if they have sufficient stock.',
  })
  @ApiParam({
    name: 'setSku',
    description: 'The SKU of the product set to delete',
    type: 'string',
    example: 'SET1234567',
  })
  @ApiBody({ type: ProductSetDeleteDto })
  @ApiResponse({
    status: 200,
    description: 'Product set deleted successfully',
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
    description: 'Product set not found',
    type: BaseResponse<null>,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: BaseResponse<null>,
  })
  async deleteProductSet(
    @Param('setSku') setSku: string,
    @Body() deleteDto: ProductSetDeleteDto,
    @Request() req: RequestWithUser,
  ) {
    try {
      // Get the authenticated user from the request
      const username = req.user?.username || 'system';

      const result = await this.productSetService.deleteProductSet(
        setSku,
        deleteDto.comment,
        username,
      );

      return this.responseService.success(
        result,
        'Product set deletion processed',
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
          message: error.message || 'Failed to delete product set',
          error: error.message,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
