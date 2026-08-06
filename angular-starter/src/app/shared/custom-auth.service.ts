import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { TokenStorageService } from './token-storage.service';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';

export interface AuthUser {
  userId:   string;
  username: string;
  email:    string;
  role:     string;
  token?:   string;
}

export interface LoginRequest   { email: string; password: string; }
export interface SignupRequest  { username?: string; email: string; password: string; }
export interface AuthResponse   {
  message: string;
  userId: string;
  username: string;
  email: string;
  role: string;
  token?: string;
}

export type GoogleLoginState = 'idle' | 'opening' | 'exchanging' | 'success' | 'error';

@Injectable({ providedIn: 'root' })
export class CustomAuthService {
  private readonly apiBase = environment.apiUrl;

  private _user = new BehaviorSubject<AuthUser | null>(null);
  private _googleLoginState = new BehaviorSubject<GoogleLoginState>('idle');
  private _googleLoginError = new BehaviorSubject<string>('');
  currentUser$: Observable<AuthUser | null> = this._user.asObservable();
  isLoggedIn$: Observable<boolean> = this._user.pipe(map(u => !!u));
  googleLoginState$: Observable<GoogleLoginState> = this._googleLoginState.asObservable();
  googleLoginError$: Observable<string> = this._googleLoginError.asObservable();
  private nativeLoginStartedAt = 0;

  constructor(
    private http: HttpClient,
    private router: Router,
    private ngZone: NgZone,
    private tokenStorage: TokenStorageService
  ) {}

  get currentUser(): AuthUser | null { return this._user.value; }
  get isLoggedIn(): boolean { return !!this._user.value; }
  get isAdmin(): boolean { return this._user.value?.role === 'ADMIN'; }

  getToken(): string | null { return this.tokenStorage.get(); }

  async initSession(): Promise<void> {
    await this.tokenStorage.init();
    const storedToken = this.tokenStorage.get();
    if (Capacitor.isNativePlatform()) {
      await App.addListener('appUrlOpen', event => void this.handleNativeAuthUrl(event.url));
      await App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive || this._googleLoginState.value !== 'opening') return;
        const attemptStartedAt = this.nativeLoginStartedAt;
        setTimeout(() => {
          if (this.nativeLoginStartedAt === attemptStartedAt && this._googleLoginState.value === 'opening') {
            this.failGoogleLogin('Google sign-in was cancelled or did not return to the app. Please try again.');
          }
        }, 1200);
      });
      const launch = await App.getLaunchUrl();
      if (launch?.url) await this.handleNativeAuthUrl(launch.url);
    }
    try {
      await this.refreshSession().toPromise();
    } catch {
      // A valid native token restores the user through /auth/me. If the token
      // has genuinely expired, remove it once so subsequent launches show a
      // clean login instead of repeatedly retrying a stale credential.
      if (Capacitor.isNativePlatform() && storedToken) await this.tokenStorage.clear();
    }
  }

  getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiBase}/auth/login`, { email, password }, { withCredentials: true })
      .pipe(tap(r => this.persist(r)));
  }

  signup(email: string, password: string, username?: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiBase}/auth/register`, { email, password, username }, { withCredentials: true })
      .pipe(tap(r => this.persist(r)));
  }

  async startGoogleLogin(returnUrl = this.router.url): Promise<void> {
    if (this._googleLoginState.value === 'opening' || this._googleLoginState.value === 'exchanging') return;
    const safeReturnUrl = returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/explore';
    this._googleLoginError.next('');
    this._googleLoginState.next('opening');
    if (Capacitor.isNativePlatform()) {
      this.nativeLoginStartedAt = Date.now();
      try {
        await Browser.open({
          url: `${this.apiBase}/auth/google/start?native=true&returnUrl=${encodeURIComponent(safeReturnUrl)}`,
          presentationStyle: 'fullscreen'
        });
      } catch {
        this.failGoogleLogin('Google sign-in could not be opened. Check your connection and try again.');
      }
      return;
    }
    window.location.href = `${this.apiBase}/auth/google/start?returnUrl=${encodeURIComponent(safeReturnUrl)}`;
  }

  private async handleNativeAuthUrl(url: string): Promise<void> {
    if (!url.startsWith('tech.learnwithai.app://auth-callback')) return;
    this.nativeLoginStartedAt = 0;
    this._googleLoginState.next('exchanging');
    await Browser.close().catch(() => undefined);
    let parsed: URL;
    try { parsed = new URL(url); }
    catch { this.failGoogleLogin('The Google sign-in response was invalid. Please try again.'); return; }
    const code = parsed.searchParams.get('code');
    const returnUrl = parsed.searchParams.get('returnUrl') || '/explore';
    const providerError = parsed.searchParams.get('error');
    if (providerError) {
      this.failGoogleLogin(providerError);
      return;
    }
    if (!code) {
      this.failGoogleLogin('Google did not return a sign-in code. Please try again.');
      return;
    }
    this.http.post<AuthResponse>(`${this.apiBase}/auth/native/exchange`, { code }).subscribe({
      next: response => {
        this.persist(response);
        this._googleLoginState.next('success');
        this.ngZone.run(() => this.router.navigateByUrl(returnUrl.startsWith('/') ? returnUrl : '/explore'));
      },
      error: error => this.failGoogleLogin(error?.error?.message || 'The Google session could not be completed. Please try again.')
    });
  }

  resetGoogleLoginState(): void {
    if (this._googleLoginState.value !== 'opening' && this._googleLoginState.value !== 'exchanging') {
      this._googleLoginState.next('idle');
      this._googleLoginError.next('');
    }
  }

  private failGoogleLogin(message: string): void {
    this.nativeLoginStartedAt = 0;
    this.ngZone.run(() => {
      this._googleLoginError.next(message);
      this._googleLoginState.next('error');
    });
  }

  refreshSession(): Observable<AuthResponse> {
    return this.http
      .get<AuthResponse>(`${this.apiBase}/auth/me`, { withCredentials: true })
      .pipe(tap(r => this.persist(r)));
  }

  logout(): void {
    const userId = this._user.value?.userId;
    if (userId) {
      this.http.post(
        `${this.apiBase}/auth/logout`,
        { userId },
        { headers: this.getAuthHeaders(), withCredentials: true }
      ).subscribe();
    }
    this.clearLocalSession(true);
  }

  clearLocalSession(redirectHome = false): void {
    void this.tokenStorage.clear();
    this.ngZone.run(() => this._user.next(null));
    if (redirectHome) {
      this.router.navigate(['/']);
    }
  }

  private persist(r: AuthResponse): void {
    if (!r?.userId || !r?.email) {
      throw new Error('The server returned an incomplete login response.');
    }

    const user: AuthUser = {
      userId: r.userId,
      username: r.username,
      email: r.email,
      role: r.role ?? 'USER'
    };

    // Cache the native JWT before publishing the authenticated user. Services
    // such as Notes subscribe to currentUser$ and request data immediately;
    // publishing first caused their initial Android request to leave without a
    // Bearer token and display a false empty state.
    if (r.token) void this.tokenStorage.set(r.token);
    this.ngZone.run(() => this._user.next(user));
  }
}
