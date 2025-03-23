import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { ImagePositionChangeDto } from './image-position-change.dto';

/**
 * DTO representing a image update operation
 */
export class ImageUpdateOperationDto {
  @ApiProperty({
    description: 'Current position of the image to update',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  position: number;
}

/**
 * DTO representing a new image to add
 */
export class ImageAddOperationDto {
  @ApiProperty({
    description: 'Position where the new image should be placed',
    example: 3,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  position: number;
}

/**
 * DTO for all image operations in an atomic update
 */
export class ImageOperationsDto {
  @ApiPropertyOptional({
    description: 'Array of image positions to delete',
    type: [Number],
    example: [2, 4],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  delete?: number[];

  @ApiPropertyOptional({
    description: 'Array of image update operations',
    type: [ImageUpdateOperationDto],
    example: [{ position: 1 }, { position: 3 }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageUpdateOperationDto)
  update?: ImageUpdateOperationDto[];

  @ApiPropertyOptional({
    description: 'Array of new images to add',
    type: [ImageAddOperationDto],
    example: [{ position: 5 }, { position: 6 }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageAddOperationDto)
  add?: ImageAddOperationDto[];

  @ApiPropertyOptional({
    description: 'Array of position changes for reordering images',
    type: [ImagePositionChangeDto],
    example: [
      { currentPosition: 1, newPosition: 2 },
      { currentPosition: 2, newPosition: 1 },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImagePositionChangeDto)
  reorder?: ImagePositionChangeDto[];
}
