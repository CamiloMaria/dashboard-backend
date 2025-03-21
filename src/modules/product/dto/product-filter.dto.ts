import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsEnum } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

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
    description: 'Search by product title (partial match)',
    required: false,
    example: 'Colchón',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @ApiProperty({
    description: 'Search by material/product number',
    required: false,
    example: '2157909',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  matnr?: string;

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
  sortOrder?: SortOrder = SortOrder.ASC;
}
