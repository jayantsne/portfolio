import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { GlobalLoaderService } from './global-loader.service';
@Injectable()
export class GlobalLoaderInterceptor implements HttpInterceptor {
  constructor(private loader: GlobalLoaderService) {}
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (request.headers.has('X-Skip-Loader')) return next.handle(request);
    this.loader.begin(); return next.handle(request).pipe(finalize(() => this.loader.end()));
  }
}
