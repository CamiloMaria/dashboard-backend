import {
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
  Req,
  ForbiddenException,
  Post,
  Body,
} from '@nestjs/common';
import { OrderService } from '../services/order.service';
import { OrderFilterDto, PrintOrderDto } from '../dto';
import { ResponseService } from 'src/common/services/response.service';
import {
  BaseResponse,
  PaginatedResponse,
} from 'src/common/schemas/response.schema';
import { IOrderResponse } from '../interfaces/order-response.interface';
import { RequestWithUser } from 'src/common/interfaces/request.interface';
import { ExternalApiService } from 'src/common/services/external-api.service';
import { SpoolerResponse } from 'src/common/interfaces/ptlog-api.interface';
import { RequirePages } from 'src/common';
import { UserLogsService } from 'src/common/services/user-logs.service';
import { LogType } from 'src/common/constants/log-types.enum';

@ApiTags('Orders')
@ApiCookieAuth()
@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly responseService: ResponseService,
    private readonly externalApiService: ExternalApiService,
    private readonly userLogsService: UserLogsService,
  ) {}

  @Get()
  @RequirePages('/orders')
  @ApiOperation({ summary: 'Get all orders with pagination' })
  @ApiQuery({ type: OrderFilterDto })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully',
    type: PaginatedResponse<IOrderResponse[]>,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'No orders found',
    type: BaseResponse<null>,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: BaseResponse<null>,
  })
  async findAll(@Query() filterDto: OrderFilterDto) {
    try {
      const { items, meta } = await this.orderService.findAll(filterDto);
      return this.responseService.paginate(
        items,
        meta.totalItems,
        meta.currentPage,
        meta.itemsPerPage,
        'Orders retrieved successfully',
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
          message: error.message || 'Failed to retrieve orders',
          error: error.message,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('spooler')
  @RequirePages('/orders:print')
  @ApiOperation({ summary: 'Get spooler information for order printing' })
  @ApiResponse({
    status: 200,
    description: 'Spooler information retrieved successfully',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have permission to access spooler',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 502,
    description: 'Bad Gateway - Failed to get spooler from external API',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: BaseResponse,
  })
  async getSpooler(@Req() request: RequestWithUser) {
    try {
      // Extract user email from authenticated request
      const { email } = request.user;

      // Call external API service to get spooler information
      const spoolerData: SpoolerResponse =
        await this.externalApiService.getSpooler(email);

      if (!spoolerData) {
        throw new HttpException(
          {
            success: false,
            message: 'No spooler found',
            error: 'No spooler found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      // Return formatted response
      return this.responseService.success(
        spoolerData,
        'Spooler information retrieved successfully',
        {
          statusCode: HttpStatus.OK,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to retrieve spooler information',
          error: error.message,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('print')
  @RequirePages('/orders:print')
  @ApiOperation({ summary: 'Send an order to print' })
  @ApiBody({ type: PrintOrderDto })
  @ApiResponse({
    status: 200,
    description: 'Order sent to print successfully',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have permission to print orders',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 502,
    description: 'Bad Gateway - Failed to send order to print via external API',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: BaseResponse,
  })
  async printOrder(
    @Body() printOrderDto: PrintOrderDto,
    @Req() request: RequestWithUser,
  ) {
    try {
      // Extract user email from authenticated request
      const { email, username } = request.user;
      const { orderNumber, spooler, forcePrint } = printOrderDto;

      // change order status to print from PRINT 1 to PRINT 0 if forcePrint is true
      await this.orderService.changeOrderStatusToPrint(orderNumber, forcePrint);

      // Call external API service to send the order to print
      const printResponse = await this.externalApiService.sendOrderToPrint(
        orderNumber,
        email,
        spooler,
      );

      // Log the print order request
      await this.userLogsService.logCreate(
        username,
        'print-order',
        `Order ${orderNumber} sent to print on spooler ${spooler}${forcePrint ? ' (forced)' : ''}`,
      );

      // Return formatted response
      return this.responseService.success(
        printResponse,
        'Order sent to print successfully',
        {
          statusCode: HttpStatus.OK,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      // Log the error
      if (request.user?.username) {
        await this.userLogsService
          .logGeneric(
            request.user.username,
            LogType.CREATE,
            'print-order',
            `Failed to print order: ${error.message}`,
          )
          .catch(() => {
            // Silently catch any logging errors to prevent cascading failures
          });
      }

      if (error instanceof ForbiddenException) {
        throw error;
      }

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to send order to print',
          error: error.message,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
