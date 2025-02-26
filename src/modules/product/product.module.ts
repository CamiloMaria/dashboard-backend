import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebProduct } from './entities/web-product.entity';
import { WebProductImage } from './entities/web-product-image.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WebProduct, WebProductImage])],
  controllers: [],
  providers: [],
  exports: [TypeOrmModule],
})
export class ProductModule {}
