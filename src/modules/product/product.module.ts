import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DatabaseConnection } from '../../config/database/constants';
import {
  WebCatalog,
  WebProduct,
  WebProductGroup,
  WebProductImage,
  WebProductPromo,
  WebPromo,
  WebSetProducts,
  WebProductSetRelation,
} from './entities/shop';
import { ProductController } from './controllers/product.controller';
import { ProductService } from './services/product.service';
import { ProductMapper } from './mappers/product.mapper';
import { ResponseService } from '../../common/services/response.service';
import { PromotionController } from './controllers/promotion.controller';
import { PromotionService } from './services/promotion.service';
import { PromotionMapper } from './mappers/promotion.mapper';
import { ProductSetController } from './controllers/product-set.controller';
import { ProductSetService } from './services/product-set.service';
import { ProductSetMapper } from './mappers/product-set.mapper';
import { ProductImageService } from './services/product-image.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature(
      [
        WebProduct,
        WebProductImage,
        WebProductGroup,
        WebCatalog,
        WebPromo,
        WebProductPromo,
        WebSetProducts,
        WebProductSetRelation,
      ],
      DatabaseConnection.SHOP,
    ),
  ],
  controllers: [ProductController, PromotionController, ProductSetController],
  providers: [
    ProductService,
    ProductMapper,
    ResponseService,
    PromotionService,
    PromotionMapper,
    ProductSetService,
    ProductSetMapper,
    ProductImageService,
  ],
  exports: [TypeOrmModule],
})
export class ProductModule {}
