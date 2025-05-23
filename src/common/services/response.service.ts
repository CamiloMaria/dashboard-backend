import { Injectable } from '@nestjs/common';
import { BaseResponse, PaginationMeta } from '../schemas/response.schema';

/**
 * Interface for standardized responses
 */
export interface Response<T> {
  success: boolean;
  message: string;
  data?: T;
  meta?: any;
  error?: string;
}

@Injectable()
export class ResponseService {
  /**
   * Create a success response with optional metadata
   */
  success<T>(
    data: T,
    message = 'Operation successful',
    meta?: any,
  ): BaseResponse<T> {
    return {
      success: true,
      message,
      data,
      ...(meta && { meta }),
    };
  }

  /**
   * Create a paginated response with metadata
   */
  paginate<T>(
    data: T,
    totalItems: number,
    currentPage: number,
    itemsPerPage: number,
    message = 'Operation successful',
    meta?: any,
  ): BaseResponse<T> {
    const pagination: PaginationMeta = {
      currentPage,
      itemsPerPage,
      totalItems,
      totalPages: Math.ceil(totalItems / itemsPerPage),
    };

    return {
      success: true,
      message,
      data,
      ...(meta ? { meta: { ...meta, pagination } } : { meta: { pagination } }),
    };
  }

  /**
   * Create an error response
   */
  error<T>(message: string, errorCode?: string, meta?: any): BaseResponse<T> {
    return {
      success: false,
      message,
      error: errorCode,
      ...(meta && { meta }),
    };
  }
}
