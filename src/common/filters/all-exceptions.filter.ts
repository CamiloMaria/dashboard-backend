import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { Response } from '../services/response.service';
import { LoggerService } from '../../config/logger/logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(@Inject(LoggerService) private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';

    const errorName =
      exception instanceof HttpException
        ? exception.name
        : exception instanceof Error
          ? exception.name
          : 'InternalServerError';

    const errorResponse: Response<null> = {
      success: false,
      message,
      error: errorName,
      meta: {
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };

    // Log the error with stack trace
    this.logger.error(
      `Unhandled exception: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
      `${request.method} ${request.url}`,
    );

    response.status(status).json(errorResponse);
  }
}
