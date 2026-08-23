import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Ensures every successful JSON response carries a `success: true` field,
 * so clients can rely on `success` being present on both success and error
 * responses without each controller having to remember to set it. Leaves
 * responses that already set `success` (the existing auth/links controllers)
 * untouched rather than double-wrapping them.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (
          data === null ||
          data === undefined ||
          typeof data !== 'object' ||
          Array.isArray(data) ||
          'success' in data
        ) {
          return data;
        }
        return { success: true, ...data };
      }),
    );
  }
}
