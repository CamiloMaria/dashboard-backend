import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateKeywordsDto {
  @ApiProperty({
    description: 'Product title to generate keywords for',
    example: 'Lavadora Whirlpool 10kg con Tecnología Inverter',
  })
  @IsNotEmpty({ message: 'Product title is required' })
  @IsString({ message: 'Product title must be a string' })
  productTitle: string;

  @ApiProperty({
    description: 'Product category to consider for keyword generation',
    example: 'Electrodomésticos, Línea Blanca, Lavadoras',
  })
  @IsNotEmpty({ message: 'Product category is required' })
  @IsString({ message: 'Product category must be a string' })
  productCategory: string;
}

export class GenerateKeywordsResponseDto {
  @ApiProperty({
    description: 'Comma-separated list of SEO keywords',
    example:
      'lavadora, lavadora automática, lavadora whirlpool, máquina de lavar, electrodomésticos, línea blanca',
  })
  keywords: string;
}
