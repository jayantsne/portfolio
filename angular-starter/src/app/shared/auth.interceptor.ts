import { Injectable } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler,
  HttpEvent, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { CustomAuthService } from './custom-auth.service';
import { environment } from '../../environments/environment';
import { Capacitor } from '@capacitor/core';

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
    // Relative API URLs point at Capacitor's https://localhost WebView origin.
    // Route them to the configured production API when running natively.
    const nativeApiUrl = Capacitor.isNativePlatform() && req.url.startsWith('/api')
      ? `${environment.apiUrl}${req.url.substring(4)}`
      : req.url;
    req = req.clone({ url: nativeApiUrl });

    // Skip auth header for public endpoints (register / login)
    const isAuthEndpoint = req.url.includes('/auth/register') ||
                           req.url.includes('/auth/login') ||
                           req.url.includes('/auth/google') ||
                           req.url.includes('/auth/logout');

    // These endpoints may return 401 for reasons unrelated to the user's core
    // session (e.g. backend feature not deployed, separate JWT config, etc.).
    // Callers already handle their errors gracefully (empty state / localStorage
    // fallback).  Auto-logging-out on their 401 would sign the user out
    // immediately after a successful login.
    const isAuxiliaryEndpoint = req.url.includes('/subscription') ||
                                req.url.includes('/payment') ||
                                req.url.includes('/conversation') ||
                                req.url.includes('/usage');

    const token = this.auth.getToken();
    const headers: Record<string, string> = {};
    if (Capacitor.isNativePlatform()) headers['X-Client-Platform'] = Capacitor.getPlatform();
    if (token && !isAuthEndpoint) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const isApiRequest = req.url.startsWith('/api') || req.url.startsWith(environment.apiUrl);
    const authReq = req.clone({
      setHeaders: headers,
      withCredentials: isApiRequest ? true : req.withCredentials
    });

    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        console.warn(`[AuthInterceptor] ${err.status} on ${req.url} | isAuth:${isAuthEndpoint} | isAux:${isAuxiliaryEndpoint} | hasToken:${!!token}`);
        if (err.status === 401 && !isAuthEndpoint && !isAuxiliaryEndpoint && this.auth.isLoggedIn) {
          // Token WAS sent but was rejected (expired/invalid) — clear session.
          // If no token was sent (unauthenticated request to a protected endpoint),
          // do NOT log the user out — just let the error propagate to the caller.
          console.warn('AuthInterceptor: 401 received on authenticated request — clearing session.');
          this.auth.clearLocalSession(true);
        } else if (err.status === 401 && !isAuthEndpoint && !this.auth.isLoggedIn) {
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
