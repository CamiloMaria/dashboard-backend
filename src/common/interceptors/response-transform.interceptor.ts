import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Interface for standardized API responses
 */
export interface Response<T> {
  success: boolean;
  message: string;
  data?: T;
  meta?: any;
  error?: string;
}

/**
 * Interceptor to transform and standardize all API responses
 * This ensures a consistent response format across the entire application
 */
@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  /**
   * Intercept method to transform the response
   * @param context Execution context
   * @param next Next call handler
   * @returns Observable with transformed response
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    // Process the response
    return next.handle().pipe(
      map((data) => {
        // If the response is already in our format (has success property), return it
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Otherwise transform it to the standard format
        return {
          success: true,
          message: 'Operation successful',
          data,
        };
      }),
    );
  }
}
