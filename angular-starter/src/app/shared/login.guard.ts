import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { CustomAuthService } from './custom-auth.service';
import { AuthTriggerService } from './auth-trigger.service';

@Injectable({ providedIn: 'root' })
export class LoginGuard implements CanActivate {

  constructor(
    private auth:        CustomAuthService,
    private router:      Router,
    private authTrigger: AuthTriggerService,
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (this.auth.isLoggedIn) {
      return true;
    }
    // Redirect home, store returnUrl so the modal's loggedIn event can navigate back.
    this.router.navigate(['/'], {
      queryParams: { login: 'required', returnUrl: state.url }
    });
    // Fire the trigger bus — app.component subscribes and opens the modal.
    // Small delay ensures navigation completes before the modal opens.
    setTimeout(() => this.authTrigger.requestLogin(), 350);
    return false;
  }
}
