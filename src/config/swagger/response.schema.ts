import { ApiProperty } from '@nestjs/swagger';

/**
 * Base response class for API responses
 */
export class BaseResponse<T> {
  @ApiProperty({
    example: true,
    description: 'Indicates if the request was successful',
  })
  success: boolean;

  @ApiProperty({
    example: 'Operation completed successfully',
    description: 'Response message',
  })
  message: string;

  @ApiProperty({ description: 'Response data', required: false })
  data?: T;

  @ApiProperty({
    example: null,
    description: 'Error details if any',
    required: false,
  })
  error?: any;
}

/**
 * Pagination metadata for paginated responses
 */
export class PaginationMeta {
  @ApiProperty({ example: 1, description: 'Current page number' })
  currentPage: number;

  @ApiProperty({ example: 1, description: 'Items per page' })
  itemsPerPage: number;

  @ApiProperty({ example: 36306, description: 'Total number of items' })
  totalItems: number;

  @ApiProperty({ example: 36306, description: 'Total number of pages' })
  totalPages: number;
}

/**
 * Paginated response class for API responses with pagination
 */
export class PaginatedResponse<T> extends BaseResponse<T[]> {
  @ApiProperty({ type: PaginationMeta })
  meta: PaginationMeta;
}

/**
 * Error response class for API error responses
 */
export class ErrorResponse extends BaseResponse<null> {
  @ApiProperty({ example: 'VALIDATION_ERROR', description: 'Error code' })
  errorCode: string;

  constructor(errorCode: string, message: string, error?: any) {
    super();
    this.success = false;
    this.message = message;
    this.errorCode = errorCode;
    this.error = error;
  }
}
