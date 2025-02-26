import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebProduct } from './entities/web-product.entity';
import { WebProductImage } from './entities/web-product-image.entity';
import { WebProductGroup } from './entities/web-product-group.entity';
import { WebCatalog } from './entities/web-catalog.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WebProduct,
      WebProductImage,
      WebProductGroup,
      WebCatalog,
    ]),
  ],
  controllers: [],
  providers: [],
  exports: [TypeOrmModule],
})
export class ProductModule {}
