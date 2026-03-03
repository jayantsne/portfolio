import { Injectable } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler,
  HttpEvent, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { CustomAuthService } from './custom-auth.service';

/**
 * AuthInterceptor
 * ─────────────────────────────────────────────────────────
 * 1. Automatically attaches the Bearer token to every request.
 * 2. On 401 Unauthorized: clears stale session + redirects to home.
 * 3. On 403 Forbidden:    redirects to home without logging out.
 *
 * Registered in AppModule as HTTP_INTERCEPTORS provider.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private auth: CustomAuthService, private router: Router) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Skip auth header for public endpoints (register / login)
    const isAuthEndpoint = req.url.includes('/auth/register') ||
                           req.url.includes('/auth/login');

    const token = this.auth.getToken();
    const authReq = (token && !isAuthEndpoint)
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401 && !isAuthEndpoint) {
          // Token expired or invalid on a protected endpoint — clear session and go home.
          // Do NOT do this for /auth/login or /auth/register: a 401 there just means
          // wrong credentials and should be handled by the calling component.
          console.warn('AuthInterceptor: 401 received — clearing session.');
          this.auth.logout();
          this.router.navigate(['/']);
        } else if (err.status === 403) {
          console.warn('AuthInterceptor: 403 Forbidden — redirecting home.');
          this.router.navigate(['/']);
        }
        return throwError(() => err);
      })
    );
  }
}
