import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsString,
  ArrayMinSize,
  IsNotEmpty,
  ValidateNested,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ProductSetCreationStatus {
  CREATED = 'CREATED',
  DUPLICATE = 'DUPLICATE',
  MISSING_PRODUCTS = 'MISSING_PRODUCTS',
  INSUFFICIENT_PRODUCTS = 'INSUFFICIENT_PRODUCTS',
  DIFFERENT_GROUPS = 'DIFFERENT_GROUPS',
  NO_IMAGES = 'NO_IMAGES',
  MISSING_CATALOG_ENTRIES = 'MISSING_CATALOG_ENTRIES',
  MISSING_PRODUCTS_GROUP = 'MISSING_PRODUCTS_GROUP',
  ERROR = 'ERROR',
}

class ProductInSetDto {
  @ApiProperty({
    description: 'SKU of the product to include in the set',
    example: 'SKU123456',
  })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({
    description: 'Whether this product is free in the bundle',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isFree?: boolean;
}

export class CreateProductSetDto {
  @ApiProperty({
    description: 'Title of the product set',
    example: 'Summer Collection Bundle',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Products to include in the set',
    type: [ProductInSetDto],
    minItems: 2,
  })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => ProductInSetDto)
  products: ProductInSetDto[];
}

export class CreateProductSetResultDto {
  @ApiProperty({
    description: 'Whether the product set creation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Status of the product set creation',
    enum: ProductSetCreationStatus,
    example: ProductSetCreationStatus.CREATED,
  })
  status: ProductSetCreationStatus;

  @ApiProperty({
    description: 'Message describing the result of the product set creation',
    example: 'Product set created successfully',
  })
  message: string;

  @ApiProperty({
    description: 'SKU of the created product set',
    example: 'SET123456',
    required: false,
  })
  setSku?: string;

  @ApiProperty({
    description: 'List of products that failed validation',
    type: [String],
    required: false,
  })
  failedProducts?: string[];

  @ApiProperty({
    description: 'Error message if creation failed',
    example: 'Database connection error',
    required: false,
  })
  error?: string;

  @ApiProperty({
    description: 'Total price of the product set',
    example: 199.99,
    required: false,
  })
  totalPrice?: number;
}
