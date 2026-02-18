import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { Request } from 'express';
import { HttpMetricsService } from './http-metrics.service';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly httpMetricsService: HttpMetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const started = Date.now();
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<{ statusCode: number }>();

    let statusCode = 200;

    return next.handle().pipe(
      catchError((error) => {
        statusCode =
          error instanceof HttpException ? error.getStatus() : 500;
        return throwError(() => error);
      }),
      finalize(() => {
        if (!statusCode || statusCode < 100) {
          statusCode = response?.statusCode ?? 200;
        }
        this.httpMetricsService.observe({
          method: request.method,
          route: this.resolveRouteLabel(request),
          statusCode,
          durationMs: Date.now() - started,
        });
      }),
    );
  }

  private resolveRouteLabel(request: Request): string {
    const routePath = request.route?.path;
    const baseUrl = request.baseUrl ?? '';
    if (routePath) {
      return `${baseUrl}${routePath}`;
    }
    const url = request.url ?? '/';
    return url.split('?')[0];
  }
}

