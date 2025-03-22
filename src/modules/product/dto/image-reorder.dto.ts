import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ImagePositionChangeDto } from './image-position-change.dto';

/**
 * DTO for reordering product images
 */
export class ImageReorderDto {
  @ApiProperty({
    description: 'Product SKU',
    example: '1234567890123',
  })
  @IsNotEmpty()
  @IsString()
  sku: string;

  @ApiProperty({
    description: 'Array of position changes',
    type: [ImagePositionChangeDto],
    example: [
      { currentPosition: 1, newPosition: 2 },
      { currentPosition: 2, newPosition: 1 },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImagePositionChangeDto)
  positionChanges: ImagePositionChangeDto[];
}
