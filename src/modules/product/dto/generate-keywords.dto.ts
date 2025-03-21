import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateKeywordsDto {
  @ApiProperty({
    description: 'Product SKU',
    example: 'WP-LAV-10KG-INV',
  })
  @IsNotEmpty({ message: 'Product SKU is required' })
  @IsString({ message: 'Product SKU must be a string' })
  sku: string;
}

export class GenerateKeywordsResponseDto {
  @ApiProperty({
    description: 'Comma-separated list of SEO keywords',
    example:
      'lavadora, lavadora automática, lavadora whirlpool, máquina de lavar, electrodomésticos, línea blanca',
  })
  keywords: string;
}
