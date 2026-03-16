import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface AuthUser {
  userId:   string;
  username: string;
  email:    string;
  role:     string;   // 'ADMIN' | 'USER'
  token:    string;
}

export interface LoginRequest   { email: string; password: string; }
export interface SignupRequest  { username?: string; email: string; password: string; }
export interface AuthResponse   {
  message: string; userId: string; username: string; email: string; role: string; token: string;
}

const TOKEN_KEY = 'auth_jwt';

@Injectable({ providedIn: 'root' })
export class CustomAuthService {

  private readonly apiBase = environment.apiUrl;

  private _user = new BehaviorSubject<AuthUser | null>(this.loadFromStorage());
  /** Emits the current user or null when logged out. */
  currentUser$: Observable<AuthUser | null> = this._user.asObservable();
  /** Emits true when logged in, false when logged out. No inner subscription leak. */
  isLoggedIn$:  Observable<boolean>         = this._user.pipe(map(u => !!u));

  constructor(
    private http:   HttpClient,
    private router: Router,
    private ngZone: NgZone
  ) {}

  // ─── Public getters ─────────────────────────────────────────────────────

  get currentUser(): AuthUser | null { return this._user.value; }
  get isLoggedIn():  boolean         { return !!this._user.value; }
  get isAdmin():     boolean         { return this._user.value?.role === 'ADMIN'; }

  getToken(): string | null { return this._user.value?.token ?? null; }

  /** Build Authorization header for JWT-protected endpoints */
  getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${this.getToken() ?? ''}`
    });
  }

  // ─── Auth methods ────────────────────────────────────────────────────────

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiBase}/auth/login`, { email, password })
      .pipe(tap(r => this.persist(r)));
  }

  signup(email: string, password: string, username?: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiBase}/auth/register`, { email, password, username })
      .pipe(tap(r => this.persist(r)));
  }

  logout(): void {
    const userId = this._user.value?.userId;
    if (userId) {
      // Fire-and-forget — no need to block UI
      this.http.post(`${this.apiBase}/auth/logout`, { userId },
        { headers: this.getAuthHeaders() }).subscribe();
    }
    localStorage.removeItem(TOKEN_KEY);
    // Always emit inside NgZone so Angular's CD is guaranteed to run
    this.ngZone.run(() => this._user.next(null));
    this.router.navigate(['/']);
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private persist(r: AuthResponse): void {
    const user: AuthUser = {
      userId:   r.userId,
      username: r.username,
      email:    r.email,
      role:     r.role ?? 'USER',
      token:    r.token
    };
    localStorage.setItem(TOKEN_KEY, JSON.stringify(user));
    // Wrap in ngZone.run() so the BehaviorSubject emission ALWAYS happens
    // inside Angular's zone — even if the HTTP response callback ran outside
    // (e.g. AOT/production builds, service-worker proxies, fetch-based HttpClient).
    // Without this, markForCheck/detectChanges on the header never gets a CD cycle.
    this.ngZone.run(() => this._user.next(user));
  }

  private loadFromStorage(): AuthUser | null {
    try {
      const raw = localStorage.getItem(TOKEN_KEY);
      if (!raw) return null;
      const user: AuthUser = JSON.parse(raw);
      // Discard expired tokens so the app never starts in a broken auth state
      if (this.isTokenExpired(user.token)) {
        localStorage.removeItem(TOKEN_KEY);
        console.warn('Auth: stored token expired — logged out.');
        return null;
      }
      return user;
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
  }

  /** Decode JWT payload and compare exp claim against current time.
   *  IMPORTANT: JWT uses base64url (RFC 4648 §5) which replaces + with -
   *  and / with _. Standard atob() does not handle this encoding, so we
   *  must normalise the string first or atob() throws on production tokens
   *  that happen to contain those characters — silently logging users out.
   */
  private isTokenExpired(token: string): boolean {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) return false;
      // Normalise base64url → standard base64
      const base64 = base64Url
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(base64Url.length + (4 - base64Url.length % 4) % 4, '=');
      const payload = JSON.parse(atob(base64));
      // exp is in seconds; Date.now() is in ms
      return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now();
    } catch {
      // Cannot parse → assume valid; server will reject stale tokens with 401
      // which AuthInterceptor handles by calling logout()
      return false;
    }
  }
}
