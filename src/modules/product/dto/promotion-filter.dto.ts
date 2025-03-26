import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationQueryDto } from './pagination-query.dto';

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
export class PromotionFilterDto extends PaginationQueryDto {
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
    description: 'Search',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

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
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toUpperCase();
    }
    return value;
  })
  sortOrder?: SortOrder;
}
