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
import { ResponseService } from '../../common/services/response.service';
import { PromotionController } from './controllers/promotion.controller';
import { PromotionService } from './services/promotion.service';
import { PromotionMapper } from './mappers/promotion.mapper';

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
  controllers: [ProductController, PromotionController],
  providers: [
    ProductService,
    ProductMapper,
    ResponseService,
    PromotionService,
    PromotionMapper,
  ],
  exports: [TypeOrmModule],
})
export class ProductModule {}
