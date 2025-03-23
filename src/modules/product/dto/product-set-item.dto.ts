import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for products included in a set
 */
export class ProductSetItemDto {
  @ApiProperty({
    description: 'Product SKU',
    example: 'P12345',
  })
  productSku: string;

  @ApiProperty({
    description: 'Whether the product is free in this set',
    example: false,
  })
  is_free: boolean;

  @ApiProperty({
    description: 'Product title',
    example: 'Smartphone XYZ',
    nullable: true,
  })
  title: string | null;

  @ApiProperty({
    description: 'Product price from catalog',
    example: 199.99,
    nullable: true,
  })
  price: number | null;

  @ApiProperty({
    description: 'Product compare price from catalog',
    example: 249.99,
    nullable: true,
  })
  compare_price: number | null;
}
