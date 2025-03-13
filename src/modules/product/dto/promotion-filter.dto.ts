import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum SortField {
  SKU = 'sku',
  CREATE_AT = 'create_at',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * DTO for filtering and sorting product promotions
 */
export class PromotionFilterDto {
  @ApiProperty({
    description: 'Page number (1-based)',
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({
    description: 'Number of items per page',
    default: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiProperty({
    description: 'Promotion ID',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  no_promo?: number;

  @ApiProperty({
    description: 'Product SKU',
    required: false,
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({
    description: 'Material number',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  matnr?: number;

  @ApiProperty({
    description: 'Shop code',
    required: false,
  })
  @IsOptional()
  @IsString()
  shop?: string;

  @ApiProperty({
    description: 'Field to sort by',
    enum: SortField,
    default: SortField.CREATE_AT,
    required: false,
  })
  @IsOptional()
  @IsEnum(SortField)
  sortBy?: SortField;

  @ApiProperty({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.DESC,
    required: false,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;
}
