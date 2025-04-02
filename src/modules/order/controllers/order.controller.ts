import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { OrderService } from '../services/order.service';
import { OrderFilterDto } from '../dto';
import { ResponseService } from 'src/common/services/response.service';

@ApiTags('Orders')
@ApiCookieAuth()
@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly responseService: ResponseService,
  ) {}

  @Get()
  async findAll(@Query() filterDto: OrderFilterDto) {
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
  }
}
