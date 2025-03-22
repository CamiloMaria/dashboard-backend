import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for product deletion
 */
export class ProductDeleteDto {
  @ApiPropertyOptional({
    example: 'Product is discontinued',
    description: 'Reason for deletion',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  comment?: string;
}
