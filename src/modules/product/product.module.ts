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
  WebProductRemoved,
} from './entities/shop';
import { ProductController } from './controllers/product.controller';
import { ProductService } from './services/product.service';
import { ProductMapper } from './mappers/product.mapper';
import { ResponseService } from '../../common/services/response.service';
import { ProductPromotionController } from './controllers/product-promotion.controller';
import { PromotionService } from './services/product-promotion.service';
import { PromotionMapper } from './mappers/promotion.mapper';
import { ProductSetController } from './controllers/product-set.controller';
import { ProductSetService } from './services/product-set.service';
import { ProductSetMapper } from './mappers/product-set.mapper';
import { ProductImageService } from './services/product-image.service';
import { ProductImageController } from './controllers/product-image.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature(
      [
        WebProduct,
        WebProductImage,
        WebProductGroup,
        WebProductRemoved,
        WebCatalog,
        WebPromo,
        WebProductPromo,
        WebSetProducts,
        WebProductSetRelation,
      ],
      DatabaseConnection.SHOP,
    ),
  ],
  controllers: [
    ProductController,
    ProductPromotionController,
    ProductSetController,
    ProductImageController,
  ],
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
})
export class ProductModule {}
