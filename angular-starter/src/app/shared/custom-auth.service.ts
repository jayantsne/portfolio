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

@Injectable({ providedIn: 'root' })
export class CustomAuthService {
  private readonly apiBase = environment.apiUrl;

  private _user = new BehaviorSubject<AuthUser | null>(null);
  currentUser$: Observable<AuthUser | null> = this._user.asObservable();
  isLoggedIn$: Observable<boolean> = this._user.pipe(map(u => !!u));

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
    if (Capacitor.isNativePlatform()) {
      await App.addListener('appUrlOpen', event => void this.handleNativeAuthUrl(event.url));
      const launch = await App.getLaunchUrl();
      if (launch?.url) await this.handleNativeAuthUrl(launch.url);
    }
    await this.refreshSession().toPromise().then(() => undefined).catch(() => undefined);
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

  startGoogleLogin(returnUrl = this.router.url): void {
    const safeReturnUrl = returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/explore';
    if (Capacitor.isNativePlatform()) {
      void Browser.open({
        url: `${this.apiBase}/auth/google/start?native=true&returnUrl=${encodeURIComponent(safeReturnUrl)}`,
        presentationStyle: 'popover'
      });
      return;
    }
    window.location.href = `${this.apiBase}/auth/google/start?returnUrl=${encodeURIComponent(safeReturnUrl)}`;
  }

  private async handleNativeAuthUrl(url: string): Promise<void> {
    if (!url.startsWith('tech.learnwithai.app://auth-callback')) return;
    await Browser.close().catch(() => undefined);
    const parsed = new URL(url);
    const code = parsed.searchParams.get('code');
    const returnUrl = parsed.searchParams.get('returnUrl') || '/explore';
    if (!code) {
      this.ngZone.run(() => this.router.navigate(['/'], { queryParams: { login: 'required' } }));
      return;
    }
    this.http.post<AuthResponse>(`${this.apiBase}/auth/native/exchange`, { code }).subscribe({
      next: response => {
        this.persist(response);
        this.ngZone.run(() => this.router.navigateByUrl(returnUrl.startsWith('/') ? returnUrl : '/explore'));
      },
      error: () => this.ngZone.run(() => this.router.navigate(['/'], { queryParams: { login: 'required' } }))
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

    this.ngZone.run(() => this._user.next(user));
    if (r.token) void this.tokenStorage.set(r.token);
  }
}
