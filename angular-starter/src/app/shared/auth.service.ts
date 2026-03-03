import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { CustomAuthService } from './custom-auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticatedSubject: BehaviorSubject<boolean>;
  public isAuthenticated$: Observable<boolean>;
  private userId = 'default-user';
  private username = '';

  constructor(private apiService: ApiService, private customAuth: CustomAuthService) {
    this.isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
    this.isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
    // If there is already a stored JWT session (e.g. page refresh), reflect that
    if (customAuth.isLoggedIn) {
      const u = customAuth.currentUser!;
      this.isAuthenticatedSubject.next(true);
      this.userId   = u.userId;
      this.username = u.username;
    }
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
   * Login method - delegates to CustomAuthService which sends the correct
   * { email, password } payload, handles JWT storage, and uses the right API URL.
   */
  login(username: string, password: string): void {
    console.log('🔐 Attempting login for:', username);
    // username field on the form contains the user's email address
    this.customAuth.login(username, password).subscribe({
      next: (response) => {
        console.log('✅ Login successful:', response.username);
        this.isAuthenticatedSubject.next(true);
        this.userId   = response.userId;
        this.username = response.username;
        this.apiService.setUserId(response.userId);
      },
      error: (error) => {
        console.error('❌ Login error:', error);
        this.isAuthenticatedSubject.next(false);
      }
    });
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
