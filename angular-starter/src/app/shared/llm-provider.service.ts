import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { CustomAuthService } from './custom-auth.service';

const SELECTED_PROVIDER_KEY = 'selected_llm_provider';

export interface LlmProviderDto {
  id: string;
  providerName: string;
  displayName: string;
  enabled: boolean;
  model: string;
  baseUrl: string;
  allowedUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UpsertLlmProviderRequest {
  providerName: string;
  displayName: string;
  apiKey: string;
  model: string;
  baseUrl: string;
  enabled: boolean;
}

@Injectable({ providedIn: 'root' })
export class LlmProviderService {
  private readonly apiBase = environment.apiUrl;

  /** The provider name the user has selected (persisted in localStorage). */
  private _selectedProvider = new BehaviorSubject<string>(
    localStorage.getItem(SELECTED_PROVIDER_KEY) ?? 'ollama'
  );
  selectedProvider$ = this._selectedProvider.asObservable();

  constructor(
    private http: HttpClient,
    private authSvc: CustomAuthService
  ) {}

  get selectedProvider(): string { return this._selectedProvider.value; }

  /** Fetch the list of provider names this user is allowed to use. */
  getAvailableProviders(): Observable<{ providers: string[] }> {
    return this.http.get<{ providers: string[] }>(
      `${this.apiBase}/llm-providers/available`,
      { headers: this.authSvc.getAuthHeaders() }
    );
  }

  /** Persist the user's provider choice locally. */
  selectProvider(providerName: string): void {
    localStorage.setItem(SELECTED_PROVIDER_KEY, providerName);
    this._selectedProvider.next(providerName);
  }

  // ── Admin endpoints ──────────────────────────────────────────────────────

  getAllProviders(): Observable<LlmProviderDto[]> {
    return this.http.get<LlmProviderDto[]>(
      `${this.apiBase}/llm-providers/admin`,
      { headers: this.authSvc.getAuthHeaders() }
    );
  }

  upsertProvider(req: UpsertLlmProviderRequest): Observable<LlmProviderDto> {
    return this.http.post<LlmProviderDto>(
      `${this.apiBase}/llm-providers/admin`,
      req,
      { headers: this.authSvc.getAuthHeaders() }
    );
  }

  setEnabled(providerName: string, enabled: boolean): Observable<any> {
    return this.http.patch(
      `${this.apiBase}/llm-providers/admin/${providerName}/enabled`,
      { enabled },
      { headers: this.authSvc.getAuthHeaders() }
    );
  }

  addAllowedUser(providerName: string, userId: string): Observable<any> {
    return this.http.post(
      `${this.apiBase}/llm-providers/admin/${providerName}/allowed-users`,
      { userId },
      { headers: this.authSvc.getAuthHeaders() }
    );
  }

  removeAllowedUser(providerName: string, userId: string): Observable<any> {
    return this.http.delete(
      `${this.apiBase}/llm-providers/admin/${providerName}/allowed-users/${userId}`,
      { headers: this.authSvc.getAuthHeaders() }
    );
  }

  // ── OpenAI streaming via XHR (SSE) ──────────────────────────────────────

  /**
   * Stream a response from the OpenAI provider endpoint.
   * Uses the same SSE pattern as getOllamaExplanation().
   * Emits { explanation: string, success: boolean, done?: boolean }
   */
  streamOpenAI(prompt: string, maxTokens = 1500): Observable<{ explanation: string; success: boolean; done?: boolean }> {
    const apiBase = window.location.hostname === 'localhost' ? '' : 'https://learnwithai.tech';
    const token   = this.authSvc.getToken() ?? '';

    return new Observable(observer => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${apiBase}/api/llm-providers/openai/stream`, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.responseType = 'text';

      let cursor = 0;
      let accumulated = '';
      let lastEmitAt = 0;
      const THROTTLE_MS = 60;

      const parseChunks = (isFinal = false) => {
        const newText = xhr.responseText.slice(cursor);
        cursor = xhr.responseText.length;
        for (const line of newText.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const chunk = JSON.parse(line.slice(6));
            if (chunk.done) {
              if (chunk.error) {
                observer.next({ success: false, explanation: `⚠️ ${chunk.error}`, done: true });
              } else {
                observer.next({ success: accumulated.length > 0, explanation: accumulated, done: true });
              }
              observer.complete();
              return;
            }
            accumulated += chunk.token || '';
            const now = Date.now();
            if (isFinal || now - lastEmitAt >= THROTTLE_MS) {
              lastEmitAt = now;
              observer.next({ success: true, explanation: accumulated, done: false });
            }
          } catch { /* malformed chunk */ }
        }
      };

      xhr.onprogress = () => parseChunks();
      xhr.onload = () => {
        if (xhr.status === 403) {
          observer.next({ success: false, explanation: '⛔ You do not have access to the OpenAI provider.', done: true });
          observer.complete();
          return;
        }
        parseChunks(true);
        if (!observer.closed) {
          observer.next({ success: accumulated.length > 0, explanation: accumulated, done: true });
          observer.complete();
        }
      };
      xhr.onerror = () => {
        observer.next({ success: false, explanation: '🔌 Connection error. Check your network.', done: true });
        observer.complete();
      };

      xhr.send(JSON.stringify({ question: prompt, maxTokens }));
      return () => xhr.abort();
    });
  }
}
