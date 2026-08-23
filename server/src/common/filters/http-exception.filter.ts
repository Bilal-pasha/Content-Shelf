import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { Logger } from 'nestjs-pino';

/**
 * Normalizes every error response to the same envelope the success paths
 * already use: { success: false, message, errors, statusCode }. Without
 * this, validation errors used one shape and everything else fell back to
 * Nest's default { statusCode, message, error } shape.
 *
 * Takes nestjs-pino's singleton `Logger`, not the request-scoped
 * `PinoLogger` — a global filter is instantiated once outside any request
 * context, so it can't depend on a scoped provider.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const body = isHttpException ? exception.getResponse() : null;

    let message = 'Internal server error';
    let errors: unknown;

    if (typeof body === 'string') {
      message = body;
    } else if (body && typeof body === 'object') {
      const record = body as Record<string, unknown>;
      if (typeof record.message === 'string') message = record.message;
      else if (Array.isArray(record.message)) message = 'Validation failed';
      if ('errors' in record) errors = record.errors;
      else if (Array.isArray(record.message)) errors = record.message;
    } else if (exception instanceof Error && isHttpException) {
      message = exception.message;
    }

    if (!isHttpException) {
      // Unexpected error — never leak internals to the client, but log the real one.
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        exception instanceof Error ? exception.message : 'Unhandled exception',
        stack,
        'HttpExceptionFilter',
      );
    }

    response.status(status).json({
      success: false,
      message,
      ...(errors !== undefined ? { errors } : {}),
      statusCode: status,
    });
  }
}
