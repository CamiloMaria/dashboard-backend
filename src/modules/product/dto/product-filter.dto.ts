import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

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
}
