import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
import { OrderService } from '../services/order.service';
import { WebOrder } from '../entities/oracle';

@ApiTags('Orders')
@ApiCookieAuth()
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  async findAll(): Promise<WebOrder[]> {
    return this.orderService.findAll();
  }
}
