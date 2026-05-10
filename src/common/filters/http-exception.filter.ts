import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const normalized = this.normalizeExceptionResponse(exceptionResponse, status);

    response.status(status).json({
      success: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        details: normalized.details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }

  private normalizeExceptionResponse(
    exceptionResponse: string | object | null,
    status: number,
  ) {
    if (typeof exceptionResponse === 'string') {
      return {
        code: this.codeFromStatus(status),
        message: exceptionResponse,
        details: {},
      };
    }

    if (exceptionResponse && typeof exceptionResponse === 'object') {
      const response = exceptionResponse as Record<string, unknown>;
      const message = Array.isArray(response.message)
        ? response.message.join(', ')
        : String(response.message ?? this.defaultMessage(status));

      const details =
        Array.isArray(response.message) || response.error
          ? { raw: response }
          : response;

      return {
        code: String(response.code ?? this.codeFromStatus(status)),
        message,
        details,
      };
    }

    return {
      code: this.codeFromStatus(status),
      message: this.defaultMessage(status),
      details: {},
    };
  }

  private codeFromStatus(status: number) {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }

  private defaultMessage(status: number) {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'Request validation failed.';
      case HttpStatus.UNAUTHORIZED:
        return 'Authentication is required.';
      case HttpStatus.FORBIDDEN:
        return 'You do not have permission to access this resource.';
      case HttpStatus.NOT_FOUND:
        return 'Requested resource was not found.';
      case HttpStatus.CONFLICT:
        return 'Request could not be completed due to a conflict.';
      default:
        return 'Unexpected server error.';
    }
  }
}
