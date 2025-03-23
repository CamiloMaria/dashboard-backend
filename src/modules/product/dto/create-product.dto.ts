import { IsArray, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WebProduct } from '../entities/shop';

export class CreateProductsDto {
  @ApiProperty({
    description: 'Array of product SKUs to create',
    type: [String],
    example: ['123456789', '987654321'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one SKU is required' })
  @IsString({ each: true })
  skus: string[];
}

export enum ProductCreationStatus {
  CREATED = 'CREATED',
  EXISTING = 'EXISTING',
  NO_PRICE = 'NO_PRICE',
  ERROR = 'ERROR',
}

export class CreateProductResultDto {
  sku: string;
  product?: WebProduct;
  success: boolean;
  message: string;
  status: ProductCreationStatus;
}
