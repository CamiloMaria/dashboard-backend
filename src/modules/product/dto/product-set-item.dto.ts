import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for products included in a set
 */
export class ProductSetItemDto {
  @ApiProperty({
    description: 'Product SKU',
    example: '7460170355288',
  })
  productSku: string;

  @ApiProperty({
    description: 'Product title',
    example: 'Kitchen Knife Set',
    required: false,
  })
  title?: string;

  @ApiProperty({
    description: 'Whether the product is free as part of the set',
    example: false,
  })
  is_free: boolean;
}
