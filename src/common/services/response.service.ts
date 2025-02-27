import { Injectable } from '@nestjs/common';

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
  ): Response<T> {
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
    total: number,
    page: number,
    limit: number,
    message = 'Operation successful',
  ): Response<T> {
    return {
      success: true,
      message,
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create an error response
   */
  error<T>(message: string, errorCode?: string, meta?: any): Response<T> {
    return {
      success: false,
      message,
      error: errorCode,
      ...(meta && { meta }),
    };
  }
}
