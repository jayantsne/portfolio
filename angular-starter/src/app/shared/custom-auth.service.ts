import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AI_BACKEND } from '../config/ai.config';

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

  private readonly apiBase = AI_BACKEND.BASE_URL;

  private _user = new BehaviorSubject<AuthUser | null>(this.loadFromStorage());
  /** Emits the current user or null when logged out. */
  currentUser$: Observable<AuthUser | null> = this._user.asObservable();
  isLoggedIn$:  Observable<boolean>         = new Observable(obs =>
    this._user.subscribe(u => obs.next(!!u))
  );

  constructor(private http: HttpClient) {}

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
    this._user.next(null);
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
    this._user.next(user);
  }

  private loadFromStorage(): AuthUser | null {
    try {
      const raw = localStorage.getItem(TOKEN_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
