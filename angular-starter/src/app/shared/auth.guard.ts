import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (this.authService.isAuthenticated()) {
      return true;
    }

    // Prompt user for credentials
    const username = prompt('Username:');
    const password = prompt('Password:');
    
    if (username && password) {
      this.authService.login(username, password);
      // Wait a bit for the async call to complete
      setTimeout(() => {
        if (this.authService.isAuthenticated()) {
          window.location.reload();
        } else {
          alert('Access denied. Incorrect credentials.');
          this.router.navigate(['/']);
        }
      }, 1000);
      return false; // Will reload if successful
    }

    alert('Access denied. Credentials required.');
    this.router.navigate(['/']);
    return false;
  }
}
