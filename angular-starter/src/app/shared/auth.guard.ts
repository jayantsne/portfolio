import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { CustomAuthService } from './custom-auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {

  constructor(private auth: CustomAuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // CustomAuthService reads from localStorage on construction,
    // so this works correctly after a browser refresh.
    if (this.auth.isLoggedIn && this.auth.isAdmin) {
      return true;
    }
    // Not logged in or not admin — redirect to home silently
    this.router.navigate(['/']);
    return false;
  }
}
