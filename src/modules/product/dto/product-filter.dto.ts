import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto';
import { Transform } from 'class-transformer';

export enum SortField {
  TITLE = 'title',
  SKU = 'sku',
  CREATED_AT = 'create_at',
  UPDATED_AT = 'update_at',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class ProductFilterDto extends PaginationQueryDto {
  @ApiProperty({
    description: 'Search by product SKU',
    required: false,
    example: '7460170355288',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  sku?: string;

  @ApiProperty({
    description: 'Filter by product status',
    required: false,
    enum: ProductStatus,
    example: ProductStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiProperty({
    description: 'Filter by bigItem flag',
    required: false,
    example: 'true',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  bigItem?: boolean;

  @ApiProperty({
    description: 'Unified search across SKU, title, and MATNR',
    required: false,
    example: 'colchon',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @ApiProperty({
    description: 'Field to sort by',
    required: false,
    enum: SortField,
    example: SortField.TITLE,
  })
  @IsOptional()
  @IsEnum(SortField)
  sortBy?: SortField = SortField.TITLE;

  @ApiProperty({
    description: 'Sort order (ascending or descending)',
    required: false,
    enum: SortOrder,
    default: SortOrder.ASC,
    example: SortOrder.ASC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toUpperCase();
    }
    return value;
  })
  sortOrder?: SortOrder = SortOrder.ASC;
}
