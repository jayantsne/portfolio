import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { CustomAuthService } from './custom-auth.service';

@Injectable({ providedIn: 'root' })
export class JwtAuthGuard implements CanActivate {

  constructor(
    private authSvc: CustomAuthService,
    private router:  Router
  ) {}

  canActivate(): boolean {
    if (this.authSvc.isLoggedIn) return true;
    this.router.navigate(['/']);
    return false;
  }
}
