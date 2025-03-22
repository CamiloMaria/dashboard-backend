import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for product set deletion
 */
export class ProductSetDeleteDto {
  @ApiPropertyOptional({
    example: 'Bundle discontinued',
    description: 'Optional reason for deletion',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  comment?: string;
}
