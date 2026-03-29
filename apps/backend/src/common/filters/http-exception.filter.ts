import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { defaultErrorCodeForStatus } from '../http/error-codes';
import { normalizeExceptionMessage } from '../http/normalize-exception-message';

export type ApiErrorJsonBody = {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string;
  code: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const isProd = process.env.NODE_ENV === 'production';

    if (exception instanceof HttpException) {
      const responseBody = exception.getResponse();
      let message: string;
      let code: string;

      if (typeof responseBody === 'string') {
        message = normalizeExceptionMessage(responseBody, responseBody || 'Error');
        code = defaultErrorCodeForStatus(status);
      } else if (
        responseBody !== null &&
        typeof responseBody === 'object' &&
        !Array.isArray(responseBody)
      ) {
        const o = responseBody as Record<string, unknown>;
        const explicitCode = typeof o.code === 'string' ? o.code : undefined;
        message = normalizeExceptionMessage(
          o.message,
          typeof o.error === 'string' ? o.error : HttpStatus[status] || 'Error',
        );
        code = explicitCode ?? defaultErrorCodeForStatus(status);
      } else {
        message = normalizeExceptionMessage(responseBody, 'Error');
        code = defaultErrorCodeForStatus(status);
      }

      const logLine = `${req.method} ${req.url} - ${status}: ${message}`;
      if (status >= 500) {
        this.logger.error(logLine);
      } else {
        this.logger.warn(logLine);
      }

      const body: ApiErrorJsonBody = {
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: req.url,
        message,
        code,
      };
      res.status(status).json(body);
      return;
    }

    const internalMsg =
      exception instanceof Error ? exception.message : 'Internal server error';
    this.logger.error(
      `${req.method} ${req.url} - ${status}: ${internalMsg}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const body: ApiErrorJsonBody = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
      message: isProd ? 'Internal server error' : internalMsg,
      code: 'INTERNAL_ERROR',
    };
    res.status(status).json(body);
  }
}
