import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';

import { catchError, Observable, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private auth: AuthService, private router: Router) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {

    // NEVER attach token to auth endpoints
    if (
      req.url.includes('/api/auth/login') ||
      req.url.includes('/api/auth/register') ||
      req.url.includes('/api/auth/refresh') ||
      req.url.includes('/api/auth/password-reset/request') ||
      req.url.includes('/api/auth/password-reset/reset') ||
      req.url.includes('/api/auth/password-reset/check-approved')
    ) {
      return next.handle(req);
    }

    const token = this.auth.getToken();

    // No token -> continue normally
    if (!token) {
      return next.handle(req);
    }

    // Attach JWT
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    return next.handle(cloned).pipe(
      catchError(error => {
        if (error?.status === 401) {
          const returnUrl = this.router.url.startsWith('/login') ? undefined : this.router.url;
          this.auth.logout();
          void this.router.navigate(['/login'], {
            queryParams: { sessionExpired: true, returnUrl }
          });
        }
        return throwError(() => error);
      })
    );
  }
}
