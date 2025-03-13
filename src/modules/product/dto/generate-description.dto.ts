import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateDescriptionDto {
  @ApiProperty({
    description: 'Product title to generate description for',
    example: 'Lavadora Whirlpool 10kg con Tecnología Inverter',
  })
  @IsNotEmpty({ message: 'Product title is required' })
  @IsString({ message: 'Product title must be a string' })
  productTitle: string;
}

export class GenerateDescriptionResponseDto {
  @ApiProperty({
    description: 'HTML formatted product description',
    example: '<p>La Lavadora Whirlpool 10kg con Tecnología Inverter...</p>',
  })
  description: string;
}
