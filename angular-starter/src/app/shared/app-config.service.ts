import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { MasterConfigDto } from './master-config.service';

// ── Hardcoded fallbacks (used when the backend is unreachable) ──────────────
// These mirror the values in src/app/config/ai.config.ts
const FALLBACK_CONFIG: MasterConfigDto = {
  // Provider
  allowedProviders:     ['ollama', 'groq', 'openrouter', 'together'],
  defaultProvider:      'backend',
  fallbackOrder:        ['groq', 'backend', 'openrouter', 'gemini', 'huggingface', 'together', 'ollama'],
  ollamaEnabled:        true,

  // Models
  modelGroq:            'llama-3.3-70b-versatile',
  modelTogether:        'mistralai/Mixtral-8x7B-Instruct-v0.1',
  modelOpenrouter:      'meta-llama/llama-3.1-8b-instruct:free',
  modelOllamaStream:    'qwen2.5:3b-instruct-q4_0',
  modelOllamaFallbacks: ['llama2', 'llama3', 'mistral', 'codellama', 'gemma'],

  // Generation
  defaultMaxTokens:    2048,
  defaultTemperature:  0.9,
  topK:                50,
  topP:                0.98,
  maxOutputTokens:     1536,
  maxTokensStream:     2048,
  maxTokensSimplified: 2048,
  defaultSystemPrompt: 'You are an expert software engineering mentor. Answer clearly and concisely.',

  // Prompts
  systemRole:                'You are an expert technical interviewer and educator. ',
  promptTypeCode:            'Provide clear code examples with comments. Focus on practical implementation.',
  promptTypeConcept:         'Explain concepts clearly with real-world analogies. Build from basics to advanced.',
  promptTypeComparison:      'Compare options objectively. Show clear differences with pros/cons.',
  promptTypeTroubleshooting: 'Diagnose the issue step-by-step. Provide actionable solutions with explanations.',
  promptTypeDefault:         'Provide comprehensive, interview-ready explanations.',
  formatInstruction:         '\n\nFormat: Use clear sections with headers. Include code examples when relevant. Make it interview-ready and easy to remember.',
  complexitySimple:          '\n\nProvide a concise, clear explanation (2-3 paragraphs).',
  complexityMedium:          '\n\nProvide a thorough explanation with:\n1. Clear concept overview\n2. Practical examples\n3. Best practices\n4. Common mistakes\n5. Interview preparation tips',
  complexityComplex:         '\n\nProvide an in-depth, comprehensive explanation with:\n1. Core concepts and fundamentals\n2. Detailed examples with code (if applicable)\n3. Advanced patterns and best practices\n4. Common pitfalls and how to avoid them\n5. Real-world applications and interview tips',

  // Cache
  cacheEnabled:        true,
  cacheDurationHours:  24,
  cacheVersion:        2,
  cacheKeyPrefix:      'ai_learn_cache_',

  // Rate limiting
  maxRequestsPerUserPerDay: 100,
  maxRequestsPerMinute:     50,
  requestDelayMs:           1200,
  maxHistory:               10,
  enableRateLimiting:       true,
  perProviderLimits: {
    backend:     30,
    groq:        30,
    gemini:      60,
    huggingface: 10,
    together:    60,
    openrouter:  10,
    ollama:      9999,
  },
  cooldownMs: {
    backend:     60000,
    groq:        60000,
    gemini:      86400000,
    huggingface: 60000,
    together:    60000,
    openrouter:  60000,
    ollama:      0,
  },

  // Feature flags
  enableSignup:       true,
  maintenanceMode:    false,
  maintenanceMessage: 'Down for maintenance. Back soon!',

  // Audit
  lastUpdatedBy: '',
  lastUpdatedAt: null,
};

/**
 * AppConfigService
 * ─────────────────────────────────────────────────────────────────────────────
 * Loads runtime configuration from the backend database once at app startup
 * (via APP_INITIALIZER in app.module.ts) and makes it available to all AI
 * services.  Falls back to hardcoded defaults if the backend is unreachable.
 *
 * Usage in any service / component:
 *   constructor(private appCfg: AppConfigService) {}
 *   const model = this.appCfg.cfg.modelGroq;
 */
@Injectable({ providedIn: 'root' })
export class AppConfigService {

  private _config: MasterConfigDto = FALLBACK_CONFIG;

  /** The full loaded (or fallback) configuration object. */
  get cfg(): MasterConfigDto { return this._config; }

  // ── Convenience accessors ──────────────────────────────────────────────────

  /** Prompt instruction for a given question type ('code' | 'concept' | 'comparison' | 'troubleshooting' | 'default') */
  promptForType(type: string): string {
    switch (type) {
      case 'code':            return this._config.promptTypeCode;
      case 'concept':         return this._config.promptTypeConcept;
      case 'comparison':      return this._config.promptTypeComparison;
      case 'troubleshooting': return this._config.promptTypeTroubleshooting;
      default:                return this._config.promptTypeDefault;
    }
  }

  /** Complexity instruction for a given level ('simple' | 'medium' | 'complex') */
  complexityInstruction(level: string): string {
    switch (level) {
      case 'simple':  return this._config.complexitySimple;
      case 'complex': return this._config.complexityComplex;
      default:        return this._config.complexityMedium;
    }
  }

  /** Per-provider requests-per-minute limit (falls back to 30) */
  rateLimit(provider: string): number {
    return this._config.perProviderLimits?.[provider] ?? 30;
  }

  /** Cooldown in ms for a given provider (falls back to 60 000) */
  cooldown(provider: string): number {
    return this._config.cooldownMs?.[provider] ?? 60_000;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  constructor(private http: HttpClient) {}

  /**
   * Called by APP_INITIALIZER before the app boots.
   * Returns an Observable; Angular waits for it to complete.
   */
  load(): Observable<MasterConfigDto> {
    return this.http.get<MasterConfigDto>('/api/app-config').pipe(
      tap(cfg => {
        this._config = cfg;
        console.log('[AppConfigService] Config loaded from DB ✓');
      }),
      catchError(err => {
        console.warn('[AppConfigService] Could not load config from DB — using defaults.', err);
        return of(FALLBACK_CONFIG);
      })
    );
  }
}
