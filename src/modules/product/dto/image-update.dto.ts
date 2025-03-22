import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for updating a product image at a specific position
 */
export class ImageUpdateDto {
  @ApiProperty({
    description: 'Product SKU',
    example: '1234567890123',
  })
  @IsNotEmpty()
  @IsString()
  sku: string;

  @ApiProperty({
    description: 'Position of the image (1 for main image)',
    example: 1,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  position: number;
}
