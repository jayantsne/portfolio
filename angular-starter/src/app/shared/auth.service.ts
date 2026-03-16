import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { CustomAuthService } from './custom-auth.service';
import { AuthResponse } from './custom-auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticatedSubject: BehaviorSubject<boolean>;
  public isAuthenticated$: Observable<boolean>;
  private userId = 'default-user';
  private username = '';

  constructor(private apiService: ApiService, private customAuth: CustomAuthService) {
    // Initialise immediately from the current CustomAuthService state (handles page refresh)
    const initial = customAuth.currentUser;
    this.isAuthenticatedSubject = new BehaviorSubject<boolean>(!!initial);
    this.isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
    if (initial) {
      this.userId   = initial.userId;
      this.username = initial.username;
    }

    // Stay in sync with CustomAuthService for ALL future login / logout events
    // (modal login, page-level login, auto-logout on 401, token expiry, etc.)
    this.customAuth.currentUser$.subscribe(user => {
      this.isAuthenticatedSubject.next(!!user);
      if (user) {
        this.userId   = user.userId;
        this.username = user.username;
        this.apiService.setUserId(user.userId);
      } else {
        this.userId   = 'default-user';
        this.username = '';
      }
    });
  }

  private checkAuthStatus(): void {
    this.apiService.checkAuth(this.userId).subscribe(
      (response) => {
        this.isAuthenticatedSubject.next(response.isAuthenticated);
      },
      (error) => {
        console.error('Error checking auth status from KV storage:', error);
        this.isAuthenticatedSubject.next(false);
      }
    );
  }

  /**
   * Login method — delegates to CustomAuthService (correct API URL, JWT storage).
   * Returns the Observable so callers can react to success/error.
   * AuthService state is kept in sync automatically via the currentUser$ subscription.
   */
  login(username: string, password: string): Observable<any> {
    console.log('🔐 Attempting login for:', username);
    return this.customAuth.login(username, password);
  }

  /**
   * Logout method - delegates to CustomAuthService to clear JWT and call backend.
   */
  logout(): void {
    this.customAuth.logout();   // clears JWT from localStorage + calls POST /auth/logout
    this.isAuthenticatedSubject.next(false);
    this.userId   = 'default-user';
    this.username = '';
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  setUserId(userId: string): void {
    this.userId = userId;
    this.apiService.setUserId(userId);
    this.checkAuthStatus();
  }

  getUsername(): string {
    return this.username;
  }

  getUserId(): string {
    return this.userId;
  }
}
