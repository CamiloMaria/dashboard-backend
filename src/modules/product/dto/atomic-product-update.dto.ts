import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ImagePositionChangeDto } from './image-position-change.dto';
import { ProductUpdateDto } from './product-update.dto';

/**
 * DTO for atomic product update
 */
export class AtomicProductUpdateDto {
  @ApiProperty({
    description: 'Product SKU',
    example: '1234567890123',
  })
  @IsNotEmpty()
  @IsString()
  sku: string;

  @ApiPropertyOptional({
    description: 'Array of image positions to delete',
    type: [Number],
    example: [2, 4],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  imagesToDelete?: number[];

  @ApiPropertyOptional({
    description: 'Images to reorder',
    type: [ImagePositionChangeDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImagePositionChangeDto)
  imagesToReorder?: ImagePositionChangeDto[];

  @ApiPropertyOptional({
    description: 'Product metadata updates',
    type: ProductUpdateDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ProductUpdateDto)
  metadata?: ProductUpdateDto;
}

/**
 * DTO for handling form data with atomic product updates
 */
export class AtomicProductUpdateFormDto {
  @ApiProperty({
    description: 'JSON string containing the atomic update data',
    type: 'string',
  })
  data: string;
}
