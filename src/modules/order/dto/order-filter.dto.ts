import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsEnum } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto';
import { Transform } from 'class-transformer';

export enum SortField {
  ORDEN = 'ORDEN',
  SHOP = 'TIENDA',
  REGISTERED_AT = 'FECHA_REGISTRO',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class OrderFilterDto extends PaginationQueryDto {
  @ApiProperty({
    description: 'Store code',
    required: false,
    example: 'PL08',
  })
  @IsOptional()
  @IsString()
  store?: string;

  @ApiProperty({
    description: 'Search across order number, RNC, and email fields',
    required: false,
    example: 'example@email.com',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @ApiProperty({
    description: 'Field to sort by',
    required: false,
    enum: SortField,
    example: SortField.REGISTERED_AT,
  })
  @IsOptional()
  @IsEnum(SortField)
  sortBy?: SortField = SortField.REGISTERED_AT;

  @ApiProperty({
    description: 'Sort order (ascending or descending)',
    required: false,
    enum: SortOrder,
    default: SortOrder.DESC,
    example: SortOrder.ASC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toUpperCase();
    }
    return value;
  })
  sortOrder?: SortOrder = SortOrder.DESC;
}
