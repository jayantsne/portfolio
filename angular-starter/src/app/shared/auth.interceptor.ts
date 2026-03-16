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

    // Subscription / payment endpoints may be hosted on a separate service with a
    // different JWT-validation setup.  A 401 from these does NOT mean the user's
    // core session is invalid — callers already handle the error with catchError.
    // Auto-logging-out on their 401 would sign the user out immediately after login.
    const isAuxiliaryEndpoint = req.url.includes('/subscription') ||
                                req.url.includes('/payment');

    const token = this.auth.getToken();
    const authReq = (token && !isAuthEndpoint)
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        console.warn(`[AuthInterceptor] ${err.status} on ${req.url} | isAuth:${isAuthEndpoint} | isAux:${isAuxiliaryEndpoint} | hasToken:${!!token}`);
        if (err.status === 401 && !isAuthEndpoint && !isAuxiliaryEndpoint && token) {
          // Token WAS sent but was rejected (expired/invalid) — clear session.
          // If no token was sent (unauthenticated request to a protected endpoint),
          // do NOT log the user out — just let the error propagate to the caller.
          console.warn('AuthInterceptor: 401 received on authenticated request — clearing session.');
          this.auth.logout();
          this.router.navigate(['/']);
        } else if (err.status === 401 && !isAuthEndpoint && !token) {
          // Public endpoint returned 401 with no token — ignore, don't touch session.
          console.warn('AuthInterceptor: 401 on unauthenticated request — ignoring.');
        } else if (err.status === 401 && isAuxiliaryEndpoint) {
          // Subscription/payment service 401 — let the caller's catchError handle it.
          console.warn('AuthInterceptor: 401 from auxiliary endpoint — suppressing auto-logout.');
        } else if (err.status === 403) {
          console.warn('AuthInterceptor: 403 Forbidden — redirecting home.');
          this.router.navigate(['/']);
        }
        return throwError(() => err);
      })
    );
  }
}
