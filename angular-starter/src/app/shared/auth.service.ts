import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticatedSubject: BehaviorSubject<boolean>;
  public isAuthenticated$: Observable<boolean>;
  private userId = 'default-user';
  private username = '';

  constructor(private apiService: ApiService) {
    // Check authentication status from KV storage
    this.isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
    this.isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
    this.checkAuthStatus();
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
   * Login method - validates against Cloudflare KV backend with encrypted password
   */
  login(username: string, password: string): void {
    console.log('🔐 Attempting login for:', username);
    this.apiService.login(username, password).subscribe(
      (response) => {
        console.log('📥 Login response:', response);
        if (response.success) {
          this.isAuthenticatedSubject.next(true);
          this.userId = response.userId;
          this.username = response.username;
          this.apiService.setUserId(response.userId);
          console.log('✅ Login successful:', response.username);
        } else {
          console.log('❌ Login failed:', response.error);
          this.isAuthenticatedSubject.next(false);
        }
      },
      (error) => {
        console.error('❌ Login error:', error);
        console.error('Error details:', error.error);
        this.isAuthenticatedSubject.next(false);
      }
    );
  }

  /**
   * Logout method
   */
  logout(): void {
    this.apiService.logout(this.userId).subscribe(
      () => {
        this.isAuthenticatedSubject.next(false);
        this.userId = 'default-user';
        this.username = '';
      },
      (error) => {
        console.error('Logout error:', error);
        this.isAuthenticatedSubject.next(false);
      }
    );
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
