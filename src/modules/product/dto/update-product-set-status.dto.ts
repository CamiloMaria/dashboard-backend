import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ProductSetStatusDto {
  @ApiProperty({
    description: 'Status of the product set (active/inactive)',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  status: boolean;
}
