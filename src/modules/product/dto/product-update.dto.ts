import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsJSON,
  Min,
  Max,
  MaxLength,
  IsArray,
} from 'class-validator';

/**
 * DTO for updating WebCatalog status and related fields
 */
export class CatalogUpdateDto {
  @ApiProperty({ example: 1, description: 'Catalog ID to update' })
  @IsNumber()
  id: number;

  @ApiPropertyOptional({
    example: 0,
    description: '0 if is disabled and 1 if not',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  status?: number;

  @ApiPropertyOptional({
    example: 'Temporarily disabled due to quality issues',
    description: 'Reason for status change',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  status_comment?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'If true, status will not be automatically updated by cron jobs',
  })
  @IsOptional()
  @IsBoolean()
  manual_override?: boolean;
}

/**
 * DTO for updating WebProduct fields
 */
export class ProductUpdateDto {
  @ApiPropertyOptional({
    example: 'Juego De Colchón Beauty Rest Simmons',
    description: 'Product title',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @ApiPropertyOptional({
    example: '<div class="producto">...</div>',
    description: 'HTML product description',
  })
  @IsOptional()
  @IsString()
  description_instaleap?: string;

  @ApiPropertyOptional({
    example: [
      { title: 'Marca', description: 'Epson' },
      { title: 'Modelo', description: 'T534120-AL' },
    ],
    description: 'Product specifications as JSON',
  })
  @IsOptional()
  @IsJSON()
  specifications?: string;

  @ApiPropertyOptional({
    example: ['2157909', 'Simmons', 'colchón', 'colchones'],
    description: 'SEO keywords for the product',
  })
  @IsOptional()
  @IsJSON()
  search_keywords?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Security stock level',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  security_stock?: number;

  @ApiPropertyOptional({
    example: 1.0,
    description: 'Click multiplier value',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  click_multiplier?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the product is deleted',
  })
  @IsOptional()
  @IsBoolean()
  borrado?: boolean;

  @ApiPropertyOptional({
    example: 'Product discontinued',
    description: 'Reason for deletion',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  borrado_comment?: string;
}

/**
 * Main DTO for patching product and/or catalog data
 */
export class ProductPatchDto {
  @ApiPropertyOptional({
    description: 'Product fields to update',
    type: ProductUpdateDto,
  })
  @IsOptional()
  @Type(() => ProductUpdateDto)
  product?: ProductUpdateDto;

  @ApiPropertyOptional({
    description: 'Catalog fields to update',
    type: [CatalogUpdateDto],
  })
  @IsOptional()
  @IsArray()
  @Type(() => CatalogUpdateDto)
  catalogs?: CatalogUpdateDto[];
}
