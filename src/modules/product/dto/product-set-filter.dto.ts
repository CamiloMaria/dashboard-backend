import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum SortField {
  CREATE_AT = 'create_at',
  UPDATE_AT = 'update_at',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * DTO for filtering and sorting product sets
 */
export class ProductSetFilterDto {
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
    description: 'Set SKU',
    required: false,
  })
  @IsOptional()
  @IsString()
  setSku?: string;

  @ApiProperty({
    description: 'Product SKU',
    required: false,
  })
  @IsOptional()
  @IsString()
  productSku?: string;

  @ApiProperty({
    description: 'Set title',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Area',
    required: false,
  })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiProperty({
    description: 'Field to sort by',
    enum: SortField,
    default: SortField.UPDATE_AT,
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
