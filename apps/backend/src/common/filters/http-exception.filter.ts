import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

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
      const logLine = `${req.method} ${req.url} - ${status}: ${JSON.stringify(responseBody)}`;
      if (status >= 500) {
        this.logger.error(logLine);
      } else {
        this.logger.warn(logLine);
      }
      const payload =
        typeof responseBody === 'string'
          ? { message: responseBody }
          : responseBody !== null &&
              typeof responseBody === 'object' &&
              !Array.isArray(responseBody)
            ? (responseBody as Record<string, unknown>)
            : { message: String(responseBody) };
      res.status(status).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: req.url,
        ...payload,
      });
      return;
    }

    const internalMsg =
      exception instanceof Error ? exception.message : 'Internal server error';
    this.logger.error(
      `${req.method} ${req.url} - ${status}: ${internalMsg}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    res.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
      message: isProd ? 'Internal server error' : internalMsg,
    });
  }
}
