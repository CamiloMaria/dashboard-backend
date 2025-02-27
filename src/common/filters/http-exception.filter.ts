import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { Response } from '../services/response.service';
import { LoggerService } from '../../config/logger/logger.service';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(@Inject(LoggerService) private readonly logger: LoggerService) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

    const errorResponse: Response<null> = {
      success: false,
      message:
        typeof exceptionResponse === 'object'
          ? exceptionResponse.message || exception.message
          : exception.message,
      error:
        typeof exceptionResponse === 'object'
          ? exceptionResponse.error || exception.name
          : exception.name,
      meta: {
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };

    // Log the error
    this.logger.error(
      `HTTP Exception: ${errorResponse.message}`,
      exception.stack,
      `${request.method} ${request.url}`,
    );

    response.status(status).json(errorResponse);
  }
}
