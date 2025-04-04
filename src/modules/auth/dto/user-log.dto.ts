import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsString, IsEnum } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum UserLogSortField {
  ID = 'id',
  USER = 'user',
  TYPE_LOG = 'type_log',
  FIELD = 'field',
  LOG = 'log',
  DATE_TIME = 'date_timer',
}

/**
 * Data transfer object for user pagination
 */
export class UserLogPaginationDto {
  @ApiProperty({
    description: 'Page number (starts from 1)',
    example: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    required: false,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  limit?: number = 10;

  @ApiProperty({
    description: 'Search term for username or email',
    example: 'john',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  search?: string;

  @ApiProperty({
    description: 'Field to sort by',
    enum: UserLogSortField,
    required: false,
    default: UserLogSortField.DATE_TIME,
  })
  @IsOptional()
  @IsEnum(UserLogSortField, {
    message: `Sort field must be one of: ${Object.values(UserLogSortField).join(', ')}`,
  })
  sortBy?: UserLogSortField = UserLogSortField.DATE_TIME;

  @ApiProperty({
    description: 'Sort order',
    enum: SortOrder,
    required: false,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder, {
    message: `Sort order must be one of: ${Object.values(SortOrder).join(', ')}`,
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toUpperCase();
    }
    return value;
  })
  sortOrder?: SortOrder = SortOrder.DESC;
}
