import { ApiProperty } from '@nestjs/swagger';
import { ProductSetItemDto } from './product-set-item.dto';

/**
 * DTO for returning product set data
 */
export class ProductSetResponseDto {
  @ApiProperty({
    description: 'Set SKU',
    example: 'SET-1234',
  })
  set_sku: string;

  @ApiProperty({
    description: 'Set title',
    example: 'Complete Kitchen Set',
  })
  title: string;

  @ApiProperty({
    description: 'Regular price',
    example: 299.99,
  })
  price: number;

  @ApiProperty({
    description: 'Discounted price',
    example: 249.99,
    required: false,
  })
  compare_price: number;

  @ApiProperty({
    description: 'Area or category',
    example: 'Kitchen',
    required: false,
  })
  area: string;

  @ApiProperty({
    description: 'Status',
    example: true,
    required: false,
  })
  status: boolean;

  @ApiProperty({
    description: 'Creation date',
    example: '2023-06-15T12:00:00Z',
  })
  create_at: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2023-08-20T14:30:00Z',
  })
  update_at: Date;

  @ApiProperty({
    description: 'Products included in this set',
    type: [ProductSetItemDto],
  })
  products: ProductSetItemDto[];
}
