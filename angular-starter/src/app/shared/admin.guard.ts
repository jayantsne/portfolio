import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { CustomAuthService } from './custom-auth.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(
    private authSvc: CustomAuthService,
    private router:  Router
  ) {}

  canActivate(): boolean | UrlTree {
    if (this.authSvc.isAdmin) return true;
    // Redirect non-admins to home
    return this.router.createUrlTree(['/']);
  }
}
