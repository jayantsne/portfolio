import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AI_BACKEND } from '../config/ai.config';
import { CustomAuthService } from './custom-auth.service';

export interface UserConfigDto {
  userId:          string;
  maxTokens:       number;
  systemPrompt:    string;
  providerToggles: Record<string, boolean>;
}

export interface UpdateUserConfigDto {
  maxTokens?:       number;
  systemPrompt?:    string;
  providerToggles?: Record<string, boolean>;
}

@Injectable({ providedIn: 'root' })
export class UserConfigService {

  private readonly endpoint = `${AI_BACKEND.BASE_URL}/user-config`;

  constructor(
    private http:     HttpClient,
    private authSvc:  CustomAuthService
  ) {}

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
}
