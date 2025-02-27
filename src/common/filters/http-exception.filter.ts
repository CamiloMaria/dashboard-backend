import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request } from 'express';
import { Response } from '../services/response.service';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
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

    response.status(status).json(errorResponse);
  }
}
