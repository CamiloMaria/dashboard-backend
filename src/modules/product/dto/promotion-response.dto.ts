import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for returning product promotion data
 */
export class PromotionResponseDto {
  @ApiProperty({
    description: 'Promotion ID',
    example: 1,
  })
  no_promo: number;

  @ApiProperty({
    description: 'Product SKU',
    example: '7460170355288',
  })
  sku: string;

  @ApiProperty({
    description: 'Material number',
    example: 123456,
    required: false,
  })
  matnr: number;

  @ApiProperty({
    description: 'Regular price',
    example: 199.99,
  })
  price: number;

  @ApiProperty({
    description: 'Promotional price',
    example: 149.99,
  })
  compare_price: number;

  @ApiProperty({
    description: 'Promotion status (1 = active)',
    example: 1,
  })
  status: number;

  @ApiProperty({
    description: 'Shop code',
    example: 'WEB001',
    required: false,
  })
  shop: string;

  @ApiProperty({
    description: 'Product title',
    example: 'Product Name',
    required: false,
  })
  product_title?: string;

  @ApiProperty({
    description: 'Promotion mapa',
    example: 4678,
    required: false,
  })
  promo_mapa?: number;

  @ApiProperty({
    description: 'Creation date',
    example: '2023-06-15T12:00:00Z',
  })
  create_at: Date;
}
