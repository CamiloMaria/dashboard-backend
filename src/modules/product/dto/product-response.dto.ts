import { ApiProperty, OmitType } from '@nestjs/swagger';
import { WebProductGroup } from '../entities/shop/web-product-group.entity';
export class ProductImageResponseDto {
  @ApiProperty({ example: 53798 })
  id: number;

  @ApiProperty({ example: 2 })
  position: number;

  @ApiProperty({ example: 1800 })
  width: number;

  @ApiProperty({ example: 1800 })
  height: number;

  @ApiProperty({ example: '7460170355288' })
  alt: string;

  @ApiProperty({
    example:
      'https://img.plazalama.com.do/ee3dfebf-4223-4962-3c50-44bd6fc22e00/base',
  })
  src: string;

  @ApiProperty({ example: '2024-12-09T00:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2025-01-23T00:00:00.000Z' })
  updated_at: Date;

  @ApiProperty({ example: null })
  status: number;
}

export class ProductCatalogResponseDto {
  @ApiProperty({ example: 58072 })
  id: number;

  @ApiProperty({ example: 999 })
  stock: number;

  @ApiProperty({ example: 'CD01' })
  shop: string;

  @ApiProperty({ example: 29077.6 })
  price: number;

  @ApiProperty({ example: 36347 })
  compare_price: number;

  @ApiProperty({ example: 1 })
  status: number;

  @ApiProperty({ example: 'No hay stock' })
  status_comment: string;

  @ApiProperty({ example: false })
  manual_override: boolean;

  @ApiProperty({ example: '2025-02-25T00:00:00.000Z' })
  status_changed_at: Date;

  @ApiProperty({ example: 'cmaria' })
  status_changed_by: string;

  @ApiProperty({ example: '2025-02-25T00:00:00.000Z' })
  updated_at: Date;
}

export class ProductGroupResponseDto extends OmitType(WebProductGroup, [
  'products',
]) {}

export class SpecificationResponseDto {
  @ApiProperty({ example: 'Marca' })
  title: string;

  @ApiProperty({ example: 'Epson' })
  description: string;
}

export class ProductResponseDto {
  @ApiProperty({ example: 6928 })
  id: number;

  @ApiProperty({ example: '7460170355288' })
  sku: string;

  @ApiProperty({
    example:
      'Juego De Colchón Beauty Rest Simmons Premier Pillow Top No Flip Full 54x74',
  })
  title: string;

  @ApiProperty({ example: '2157909' })
  material: string;

  @ApiProperty({ example: 'electro' })
  depto: string;

  @ApiProperty({ example: 'MU07' })
  grupo: string;

  @ApiProperty({ example: 1 })
  type_tax: number;

  @ApiProperty({ example: '<div class="producto">...</div>' })
  description_instaleap: string;

  @ApiProperty({
    example:
      'https://img.plazalama.com.do/a59ed73f-5b0f-4541-6ece-2a91dd84b400/base',
  })
  image_url: string;

  @ApiProperty({ example: 'UND' })
  unit: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 3996 })
  stock: number;

  @ApiProperty({ example: 1 })
  without_stock: number;

  @ApiProperty({ example: null })
  borrado_comment: string;

  @ApiProperty({ example: [] })
  shops_disable: string[];

  @ApiProperty({ example: null })
  userAdd: string;

  @ApiProperty({ example: 'rramos' })
  userUpd: string;

  @ApiProperty({ example: 0 })
  is_set: number;

  @ApiProperty({ example: 10 })
  security_stock: number;

  @ApiProperty({ example: null })
  brand: string;

  @ApiProperty({ example: [] })
  search_keywords: string[];

  @ApiProperty({ example: '2021-09-03T00:00:00.000Z' })
  create_at: Date;

  @ApiProperty({ example: '2025-02-25T00:00:00.000Z' })
  update_at: Date;

  @ApiProperty({ type: [ProductImageResponseDto] })
  images: ProductImageResponseDto[];

  @ApiProperty({
    example: [
      { title: 'Marca', description: 'Epson' },
      { title: 'Modelo', description: 'T534120-AL' },
      { title: 'Color', description: 'Negro' },
    ],
  })
  specifications: SpecificationResponseDto[];

  @ApiProperty({ type: [ProductCatalogResponseDto] })
  catalogs: ProductCatalogResponseDto[];

  @ApiProperty({ type: ProductGroupResponseDto })
  category: ProductGroupResponseDto;
}
