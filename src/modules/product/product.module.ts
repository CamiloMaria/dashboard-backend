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
  controllers: [],
  providers: [],
  exports: [TypeOrmModule],
})
export class ProductModule {}
