import { Injectable }   from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { CustomAuthService }   from './custom-auth.service';
import { SubscriptionService } from './subscription.service';

/**
 * Guards feature routes that require an active trial or paid subscription.
 * Unauthenticated users → /  (let the auth flow handle it)
 * Admin users → always allowed (bypass payment/trial checks)
 * Authenticated non-admin, no access → /subscribe
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionGuard implements CanActivate {

  constructor(
    private auth:        CustomAuthService,
    private subSvc:      SubscriptionService,
    private router:      Router
  ) {}

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    if (!this.auth.isLoggedIn) {
      // Pass returnUrl so the header can navigate back after login
      this.router.navigate(['/'], {
        queryParams: { login: 'required', returnUrl: state.url }
      });
      return false;
    }

    // ── Admin bypass: admins always have unrestricted access ────────────────
    if (this.auth.isAdmin) return true;

    const status = this.subSvc.currentStatus;

    // If we already have a cached status, use it
    if (status !== null) {
      if (status.hasAccess) return true;
      this.router.navigate(['/subscribe']);
      return false;
    }

    // Otherwise fetch fresh
    return new Promise(resolve => {
      const userId = this.auth.currentUser!.userId;
      this.subSvc.checkAccess(userId).subscribe({
        next: res => {
          if (res.hasAccess) { resolve(true); return; }
          this.router.navigate(['/subscribe']);
          resolve(false);
        },
        error: () => {
          // Fail open: allow access if check fails
          resolve(true);
        }
      });
    });
  }
}
