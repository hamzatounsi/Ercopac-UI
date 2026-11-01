import { HttpErrorResponse } from '@angular/common/http';

const KNOWN_CODES = new Set([
  'BAD_REQUEST', 'VALIDATION_ERROR', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT',
  'PAYLOAD_TOO_LARGE', 'TOO_MANY_REQUESTS', 'SERVICE_UNAVAILABLE', 'INTERNAL_ERROR'
]);

/**
 * Translation key for an API error. The backend sends a stable `code` (GlobalExceptionHandler);
 * older responses without one are mapped from the HTTP status. Status 0 means the server could not be reached.
 */
export function apiErrorKey(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'errors.UNKNOWN';
  const code = typeof error.error?.code === 'string' ? error.error.code : '';
  if (KNOWN_CODES.has(code)) return `errors.${code}`;
  switch (error.status) {
    case 0: return 'errors.NETWORK';
    case 400: return 'errors.BAD_REQUEST';
    case 401: return 'errors.UNAUTHORIZED';
    case 403: return 'errors.FORBIDDEN';
    case 404: return 'errors.NOT_FOUND';
    case 409: return 'errors.CONFLICT';
    case 413: return 'errors.PAYLOAD_TOO_LARGE';
    case 429: return 'errors.TOO_MANY_REQUESTS';
    case 503: return 'errors.SERVICE_UNAVAILABLE';
    default: return error.status >= 500 ? 'errors.INTERNAL_ERROR' : 'errors.UNKNOWN';
  }
}
