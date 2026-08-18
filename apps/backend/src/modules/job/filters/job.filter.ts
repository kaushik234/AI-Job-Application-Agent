import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class JobExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const errMessage = exception instanceof Error ? exception.message : 'Internal Server Error';
    const errName = exception instanceof Error ? exception.name : 'UnknownError';
    const stack = exception instanceof Error ? exception.stack : undefined;
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    console.error('[DISCOVERY_ERROR]', JSON.stringify({
      requestId,
      query: request?.body?.query || request?.body?.q || request?.query?.q || '',
      countries: request?.body?.countries || request?.body?.country || [],
      stage: 'CONTROLLER_EXCEPTION',
      provider: 'DiscoveryEngine',
      errorName: errName,
      errorMessage: errMessage,
      stack,
    }, null, 2));

    response.status(status).json({
      success: false,
      error: status === 500 ? 'DISCOVERY_FAILED' : 'JOB_MODULE_ERROR',
      message: status === 500 ? 'Live discovery failed. Check server diagnostics.' : errMessage,
      requestId,
    });
  }
}
