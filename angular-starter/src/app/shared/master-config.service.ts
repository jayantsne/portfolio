import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CustomAuthService } from './custom-auth.service';

export interface MasterConfigDto {
  // Provider
  allowedProviders:     string[];
  defaultProvider:      string;
  fallbackOrder:        string[];
  ollamaEnabled:        boolean;

  // Models
  modelGroq:            string;
  modelTogether:        string;
  modelOpenrouter:      string;
  modelOllamaStream:    string;
  modelOllamaFallbacks: string[];

  // Generation
  defaultMaxTokens:     number;
  defaultTemperature:   number;
  topK:                 number;
  topP:                 number;
  maxOutputTokens:      number;
  maxTokensStream:      number;
  maxTokensSimplified:  number;
  defaultSystemPrompt:  string;

  // Prompts
  systemRole:                string;
  promptTypeCode:            string;
  promptTypeConcept:         string;
  promptTypeComparison:      string;
  promptTypeTroubleshooting: string;
  promptTypeDefault:         string;
  formatInstruction:         string;
  complexitySimple:          string;
  complexityMedium:          string;
  complexityComplex:         string;

  // Cache
  cacheEnabled:        boolean;
  cacheDurationHours:  number;
  cacheVersion:        number;
  cacheKeyPrefix:      string;

  // Rate limiting
  maxRequestsPerUserPerDay: number;
  maxRequestsPerMinute:     number;
  requestDelayMs:           number;
  maxHistory:               number;
  enableRateLimiting:       boolean;
  perProviderLimits:        Record<string, number>;
  cooldownMs:               Record<string, number>;

  // Feature flags
  enableSignup:        boolean;
  maintenanceMode:     boolean;
  maintenanceMessage:  string;

  // Audit
  lastUpdatedBy:       string;
  lastUpdatedAt:       string | null;
}

export interface UpdateMasterConfigDto {
  // Provider
  allowedProviders?:     string[];
  defaultProvider?:      string;
  fallbackOrder?:        string[];
  ollamaEnabled?:        boolean;

  // Models
  modelGroq?:            string;
  modelTogether?:        string;
  modelOpenrouter?:      string;
  modelOllamaStream?:    string;
  modelOllamaFallbacks?: string[];

  // Generation
  defaultMaxTokens?:     number;
  defaultTemperature?:   number;
  topK?:                 number;
  topP?:                 number;
  maxOutputTokens?:      number;
  maxTokensStream?:      number;
  maxTokensSimplified?:  number;
  defaultSystemPrompt?:  string;

  // Prompts
  systemRole?:                string;
  promptTypeCode?:            string;
  promptTypeConcept?:         string;
  promptTypeComparison?:      string;
  promptTypeTroubleshooting?: string;
  promptTypeDefault?:         string;
  formatInstruction?:         string;
  complexitySimple?:          string;
  complexityMedium?:          string;
  complexityComplex?:         string;

  // Cache
  cacheEnabled?:        boolean;
  cacheDurationHours?:  number;
  cacheVersion?:        number;
  cacheKeyPrefix?:      string;

  // Rate limiting
  maxRequestsPerUserPerDay?: number;
  maxRequestsPerMinute?:     number;
  requestDelayMs?:           number;
  maxHistory?:               number;
  enableRateLimiting?:       boolean;
  perProviderLimits?:        Record<string, number>;
  cooldownMs?:               Record<string, number>;

  // Feature flags
  enableSignup?:        boolean;
  maintenanceMode?:     boolean;
  maintenanceMessage?:  string;
}

@Injectable({ providedIn: 'root' })
export class MasterConfigService {
  private readonly url = `/api/master-config`;

  constructor(
    private http:    HttpClient,
    private authSvc: CustomAuthService
  ) {}

  get(): Observable<MasterConfigDto> {
    return this.http.get<MasterConfigDto>(this.url, {
      headers: this.authSvc.getAuthHeaders()
    });
  }

  update(dto: UpdateMasterConfigDto): Observable<MasterConfigDto> {
    return this.http.put<MasterConfigDto>(this.url, dto, {
      headers: this.authSvc.getAuthHeaders()
    });
  }
}

