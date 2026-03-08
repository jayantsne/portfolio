import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AI_BACKEND } from '../config/ai.config';
import { CustomAuthService } from './custom-auth.service';

// ── DTOs matching the backend ─────────────────────────────────────────────────

export interface UserCustomProviderDto {
  id:        string;
  name:      string;
  baseUrl:   string;
  model:     string;
  createdAt: string;
}

export interface UserConfigDto {
  userId:          string;
  maxTokens:       number;
  systemPrompt:    string;
  providerToggles: Record<string, boolean>;
  defaultProvider: string;
  customProviders: UserCustomProviderDto[];
}

export interface UpdateUserConfigDto {
  maxTokens?:       number;
  systemPrompt?:    string;
  providerToggles?: Record<string, boolean>;
  defaultProvider?: string;
}

export interface SetDefaultProviderDto {
  providerName: string;
}

export interface AddCustomProviderDto {
  name:    string;
  baseUrl: string;
  apiKey:  string;
  model:   string;
}

export interface UpdateCustomProviderDto {
  name?:    string;
  baseUrl?: string;
  apiKey?:  string;
  model?:   string;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class UserConfigService {

  private readonly endpoint = `${AI_BACKEND.BASE_URL}/user-config`;

  constructor(
    private http:     HttpClient,
    private authSvc:  CustomAuthService
  ) {}

  // ── Core config ───────────────────────────────────────────────────────────

  getConfig(): Observable<UserConfigDto> {
    return this.http.get<UserConfigDto>(this.endpoint, {
      headers: this.authSvc.getAuthHeaders()
    });
  }

  updateConfig(dto: UpdateUserConfigDto): Observable<UserConfigDto> {
    return this.http.put<UserConfigDto>(this.endpoint, dto, {
      headers: this.authSvc.getAuthHeaders()
    });
  }

  // ── Default provider ──────────────────────────────────────────────────────

  setDefaultProvider(providerName: string): Observable<UserConfigDto> {
    return this.http.put<UserConfigDto>(
      `${this.endpoint}/default-provider`,
      { providerName } as SetDefaultProviderDto,
      { headers: this.authSvc.getAuthHeaders() }
    );
  }

  // ── Custom providers ──────────────────────────────────────────────────────

  getCustomProviders(): Observable<UserCustomProviderDto[]> {
    return this.http.get<UserCustomProviderDto[]>(
      `${this.endpoint}/custom-providers`,
      { headers: this.authSvc.getAuthHeaders() }
    );
  }

  addCustomProvider(dto: AddCustomProviderDto): Observable<UserCustomProviderDto> {
    return this.http.post<UserCustomProviderDto>(
      `${this.endpoint}/custom-providers`,
      dto,
      { headers: this.authSvc.getAuthHeaders() }
    );
  }

  updateCustomProvider(id: string, dto: UpdateCustomProviderDto): Observable<UserCustomProviderDto> {
    return this.http.put<UserCustomProviderDto>(
      `${this.endpoint}/custom-providers/${id}`,
      dto,
      { headers: this.authSvc.getAuthHeaders() }
    );
  }

  deleteCustomProvider(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.endpoint}/custom-providers/${id}`,
      { headers: this.authSvc.getAuthHeaders() }
    );
  }
}

