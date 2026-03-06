import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { CustomAuthService } from './custom-auth.service';

@Injectable({ providedIn: 'root' })
export class LoginGuard implements CanActivate {

  constructor(private auth: CustomAuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (this.auth.isLoggedIn) {
      return true;
    }
    // Not logged in — redirect to home
    this.router.navigate(['/']);
    return false;
  }
}
