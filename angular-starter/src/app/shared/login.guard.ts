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
    // Not logged in — redirect home, pass the intended URL as a return param
    // so the header can re-navigate there after successful login.
    this.router.navigate(['/'], {
      queryParams: { login: 'required', returnUrl: state.url }
    });
    return false;
  }
}
