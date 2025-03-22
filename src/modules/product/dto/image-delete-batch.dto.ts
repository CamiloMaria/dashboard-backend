import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for deleting multiple product images at specific positions
 */
export class ImageDeleteBatchDto {
  @ApiProperty({
    description: 'Product SKU',
    example: '1234567890123',
  })
  @IsNotEmpty()
  @IsString()
  sku: string;

  @ApiProperty({
    description: 'Positions of the images to delete',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  @Type(() => Number)
  positions: number[];
}
