import { IsArray, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductsDto {
  @ApiProperty({
    description: 'Array of product SKUs to create',
    type: [String],
    example: ['123456789', '987654321'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one SKU is required' })
  @IsString({ each: true })
  skus: string[];
}

export class CreateProductResultDto {
  sku: string;
  success: boolean;
  message: string;
}
