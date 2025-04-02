import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  WebArticles,
  WebFactures,
  WebOrder,
  WebTransactions,
} from './entities/oracle';
import { OrderService } from './services/order.service';
import { OrderController } from './controllers/order.controller';
import { DatabaseConnection } from 'src/config';
import { OrderMapper } from './mappers/order.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [WebOrder, WebArticles, WebFactures, WebTransactions],
      DatabaseConnection.ORACLE,
    ),
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderMapper],
  exports: [TypeOrmModule],
})
export class OrderModule {}
