import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseConnection } from '../../config/database/constants';
import {
  WebCatalog,
  WebProduct,
  WebProductGroup,
  WebProductImage,
  WebProductPromo,
  WebPromo,
} from './entities/shop';
import { ProductController } from './controllers/product.controller';
import { ProductService } from './services/product.service';
import { ProductMapper } from './mappers/product.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [
        WebProduct,
        WebProductImage,
        WebProductGroup,
        WebCatalog,
        WebPromo,
        WebProductPromo,
      ],
      DatabaseConnection.SHOP,
    ),
  ],
  controllers: [ProductController],
  providers: [ProductService, ProductMapper],
  exports: [TypeOrmModule],
})
export class ProductModule {}
