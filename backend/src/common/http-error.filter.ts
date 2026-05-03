import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

const KNOWN_CODES = new Set([
  'OUT_OF_DELIVERY_ZONE',
  'MIN_ORDER_NOT_MET',
  'OUT_OF_WORKING_HOURS',
  'PREORDER_NOT_READY',
  'PREORDER_NOT_ALLOWED',
  'INVALID_MODIFIERS',
  'INVALID_ITEMS',
  'DELIVERY_ADDRESS_REQUIRED',
  'INVALID_SCHEDULED_FOR',
  'SCHEDULED_FOR_PAST',
  'FORBIDDEN_STATUS_CHANGE',
  'DELIVERY_REQUIRED',
]);

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse() as any;
      const message = typeof res === 'string' ? res : res.message;
      const isInternal = status === HttpStatus.INTERNAL_SERVER_ERROR;
      const code = isInternal
        ? 'INTERNAL_ERROR'
        : typeof message === 'string'
        ? (KNOWN_CODES.has(message) ? message : status === HttpStatus.FORBIDDEN ? 'FORBIDDEN' : 'BAD_REQUEST')
        : 'BAD_REQUEST';

      if (isInternal) {
        console.error('[INTERNAL_ERROR]', message);
      }

      response.status(status).json({
        code,
        message: typeof message === 'string' ? message : 'Ошибка',
        details: typeof res === 'object' ? res : undefined,
      });
      return;
    }

    console.error('[INTERNAL_ERROR]', exception);
    response.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Внутренняя ошибка сервера',
    });
  }
}
