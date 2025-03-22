import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for a single image position change
 */
export class ImagePositionChangeDto {
  @ApiProperty({
    description: 'Current position of the image',
    example: 1,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  currentPosition: number;

  @ApiProperty({
    description: 'New position for the image',
    example: 2,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  newPosition: number;
}
