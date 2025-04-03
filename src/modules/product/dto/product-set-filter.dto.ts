import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto';
import { Transform } from 'class-transformer';

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
export class ProductSetFilterDto extends PaginationQueryDto {
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
    description: 'Search',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

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
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toUpperCase();
    }
    return value;
  })
  sortOrder?: SortOrder;
}
