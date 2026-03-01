import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MasterConfigService, MasterConfigDto } from '../shared/master-config.service';

@Component({
  selector: 'app-master-config',
  templateUrl: './master-config.component.html',
  styleUrls:  ['./master-config.component.css']
})
export class MasterConfigComponent implements OnInit {

  @Output() closed = new EventEmitter<void>();

  isOpen    = false;
  isLoading = false;
  isSaving  = false;
  errorMsg  = '';
  successMsg = '';

  form!: FormGroup;

  readonly PROVIDERS = ['ollama', 'groq', 'openrouter', 'together', 'openai', 'anthropic', 'gemini'];
  readonly ALL_PROVIDERS = ['backend', 'groq', 'openrouter', 'together', 'gemini', 'huggingface', 'ollama'];

  constructor(
    private fb:  FormBuilder,
    private svc: MasterConfigService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      // ── Generation ──────────────────────────────────────────────────────
      defaultMaxTokens:         [2048,  [Validators.required, Validators.min(128), Validators.max(16384)]],
      defaultTemperature:       [0.9,   [Validators.required, Validators.min(0), Validators.max(2)]],
      topK:                     [50,    [Validators.required, Validators.min(1)]],
      topP:                     [0.98,  [Validators.required, Validators.min(0), Validators.max(1)]],
      maxOutputTokens:          [1536,  [Validators.required, Validators.min(128)]],
      maxTokensStream:          [2048,  [Validators.required, Validators.min(128)]],
      maxTokensSimplified:      [2048,  [Validators.required, Validators.min(128)]],
      defaultSystemPrompt:      ['',    Validators.required],

      // ── Provider routing ─────────────────────────────────────────────────
      defaultProvider:          ['backend'],
      fallbackOrderRaw:         ['groq,backend,openrouter,gemini,huggingface,together,ollama'],
      ollamaEnabled:            [true],

      // ── Allowed providers ────────────────────────────────────────────────
      p_ollama:     [true],
      p_groq:       [true],
      p_openrouter: [true],
      p_together:   [true],
      p_openai:     [false],
      p_anthropic:  [false],
      p_gemini:     [false],

      // ── Models ───────────────────────────────────────────────────────────
      modelGroq:           ['llama-3.3-70b-versatile'],
      modelTogether:       ['mistralai/Mixtral-8x7B-Instruct-v0.1'],
      modelOpenrouter:     ['meta-llama/llama-3.1-8b-instruct:free'],
      modelOllamaStream:   ['qwen2.5:3b-instruct-q4_0'],
      modelOllamaFallbacksRaw: ['llama2,llama3,mistral,codellama,gemma'],

      // ── Prompts ──────────────────────────────────────────────────────────
      systemRole:                ['You are an expert technical interviewer and educator. ', Validators.required],
      promptTypeCode:            ['Provide clear code examples with comments. Focus on practical implementation.'],
      promptTypeConcept:         ['Explain concepts clearly with real-world analogies. Build from basics to advanced.'],
      promptTypeComparison:      ['Compare options objectively. Show clear differences with pros/cons.'],
      promptTypeTroubleshooting: ['Diagnose the issue step-by-step. Provide actionable solutions with explanations.'],
      promptTypeDefault:         ['Provide comprehensive, interview-ready explanations.'],
      formatInstruction:         ['\n\nFormat: Use clear sections with headers. Include code examples when relevant.'],
      complexitySimple:          ['\n\nProvide a concise, clear explanation (2-3 paragraphs).'],
      complexityMedium:          [''],
      complexityComplex:         [''],

      // ── Cache ────────────────────────────────────────────────────────────
      cacheEnabled:        [true],
      cacheDurationHours:  [24,  [Validators.required, Validators.min(1)]],
      cacheVersion:        [2,   [Validators.required, Validators.min(1)]],
      cacheKeyPrefix:      ['ai_learn_cache_'],

      // ── Rate limiting ─────────────────────────────────────────────────────
      enableRateLimiting:       [true],
      maxRequestsPerUserPerDay: [100,  [Validators.required, Validators.min(1)]],
      maxRequestsPerMinute:     [50,   [Validators.required, Validators.min(1)]],
      requestDelayMs:           [1200, [Validators.required, Validators.min(0)]],
      maxHistory:               [10,   [Validators.required, Validators.min(0)]],
      perProviderLimitsRaw:     [''],
      cooldownMsRaw:            [''],

      // ── Feature flags ─────────────────────────────────────────────────────
      enableSignup:       [true],
      maintenanceMode:    [false],
      maintenanceMessage: ['Down for maintenance. Back soon!'],
    });
  }

  open(): void {
    this.isOpen    = true;
    this.errorMsg  = '';
    this.successMsg = '';
    this.load();
    document.body.style.overflow = 'hidden';
  }

  close(): void {
    this.isOpen = false;
    document.body.style.overflow = '';
    this.closed.emit();
  }

  onOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('mc-overlay')) this.close();
  }

  private load(): void {
    this.isLoading = true;
    this.svc.get().subscribe({
      next: (cfg) => {
        this.isLoading = false;
        this.patchForm(cfg);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg  = err?.error?.message ?? 'Could not load configuration.';
      }
    });
  }

  private patchForm(cfg: MasterConfigDto): void {
    const providers = cfg.allowedProviders ?? [];
    this.form.patchValue({
      // Generation
      defaultMaxTokens:    cfg.defaultMaxTokens,
      defaultTemperature:  cfg.defaultTemperature,
      topK:                cfg.topK,
      topP:                cfg.topP,
      maxOutputTokens:     cfg.maxOutputTokens,
      maxTokensStream:     cfg.maxTokensStream,
      maxTokensSimplified: cfg.maxTokensSimplified,
      defaultSystemPrompt: cfg.defaultSystemPrompt,

      // Provider routing
      defaultProvider:   cfg.defaultProvider,
      fallbackOrderRaw:  (cfg.fallbackOrder ?? []).join(','),
      ollamaEnabled:     cfg.ollamaEnabled,

      // Allowed providers
      p_ollama:     providers.includes('ollama'),
      p_groq:       providers.includes('groq'),
      p_openrouter: providers.includes('openrouter'),
      p_together:   providers.includes('together'),
      p_openai:     providers.includes('openai'),
      p_anthropic:  providers.includes('anthropic'),
      p_gemini:     providers.includes('gemini'),

      // Models
      modelGroq:               cfg.modelGroq,
      modelTogether:           cfg.modelTogether,
      modelOpenrouter:         cfg.modelOpenrouter,
      modelOllamaStream:       cfg.modelOllamaStream,
      modelOllamaFallbacksRaw: (cfg.modelOllamaFallbacks ?? []).join(','),

      // Prompts
      systemRole:                cfg.systemRole,
      promptTypeCode:            cfg.promptTypeCode,
      promptTypeConcept:         cfg.promptTypeConcept,
      promptTypeComparison:      cfg.promptTypeComparison,
      promptTypeTroubleshooting: cfg.promptTypeTroubleshooting,
      promptTypeDefault:         cfg.promptTypeDefault,
      formatInstruction:         cfg.formatInstruction,
      complexitySimple:          cfg.complexitySimple,
      complexityMedium:          cfg.complexityMedium,
      complexityComplex:         cfg.complexityComplex,

      // Cache
      cacheEnabled:       cfg.cacheEnabled,
      cacheDurationHours: cfg.cacheDurationHours,
      cacheVersion:       cfg.cacheVersion,
      cacheKeyPrefix:     cfg.cacheKeyPrefix,

      // Rate limiting
      enableRateLimiting:       cfg.enableRateLimiting,
      maxRequestsPerUserPerDay: cfg.maxRequestsPerUserPerDay,
      maxRequestsPerMinute:     cfg.maxRequestsPerMinute,
      requestDelayMs:           cfg.requestDelayMs,
      maxHistory:               cfg.maxHistory,
      perProviderLimitsRaw:     JSON.stringify(cfg.perProviderLimits ?? {}, null, 2),
      cooldownMsRaw:            JSON.stringify(cfg.cooldownMs ?? {}, null, 2),

      // Feature flags
      enableSignup:       cfg.enableSignup,
      maintenanceMode:    cfg.maintenanceMode,
      maintenanceMessage: cfg.maintenanceMessage,
    });
  }

  private tryParseJson(raw: string, fallback: any): any {
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  private parseCommaList(raw: string): string[] {
    return (raw ?? '').split(',').map(s => s.trim()).filter(Boolean);
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.value;

    const allowedProviders = this.PROVIDERS.filter(p => v[`p_${p}`]);

    this.isSaving  = true;
    this.errorMsg  = '';
    this.successMsg = '';

    this.svc.update({
      // Generation
      defaultMaxTokens:    +v.defaultMaxTokens,
      defaultTemperature:  +v.defaultTemperature,
      topK:                +v.topK,
      topP:                +v.topP,
      maxOutputTokens:     +v.maxOutputTokens,
      maxTokensStream:     +v.maxTokensStream,
      maxTokensSimplified: +v.maxTokensSimplified,
      defaultSystemPrompt: v.defaultSystemPrompt,

      // Provider routing
      allowedProviders,
      defaultProvider:      v.defaultProvider,
      fallbackOrder:        this.parseCommaList(v.fallbackOrderRaw),
      ollamaEnabled:        v.ollamaEnabled,

      // Models
      modelGroq:            v.modelGroq,
      modelTogether:        v.modelTogether,
      modelOpenrouter:      v.modelOpenrouter,
      modelOllamaStream:    v.modelOllamaStream,
      modelOllamaFallbacks: this.parseCommaList(v.modelOllamaFallbacksRaw),

      // Prompts
      systemRole:                v.systemRole,
      promptTypeCode:            v.promptTypeCode,
      promptTypeConcept:         v.promptTypeConcept,
      promptTypeComparison:      v.promptTypeComparison,
      promptTypeTroubleshooting: v.promptTypeTroubleshooting,
      promptTypeDefault:         v.promptTypeDefault,
      formatInstruction:         v.formatInstruction,
      complexitySimple:          v.complexitySimple,
      complexityMedium:          v.complexityMedium,
      complexityComplex:         v.complexityComplex,

      // Cache
      cacheEnabled:       v.cacheEnabled,
      cacheDurationHours: +v.cacheDurationHours,
      cacheVersion:       +v.cacheVersion,
      cacheKeyPrefix:     v.cacheKeyPrefix,

      // Rate limiting
      enableRateLimiting:       v.enableRateLimiting,
      maxRequestsPerUserPerDay: +v.maxRequestsPerUserPerDay,
      maxRequestsPerMinute:     +v.maxRequestsPerMinute,
      requestDelayMs:           +v.requestDelayMs,
      maxHistory:               +v.maxHistory,
      perProviderLimits:        this.tryParseJson(v.perProviderLimitsRaw, undefined),
      cooldownMs:               this.tryParseJson(v.cooldownMsRaw, undefined),

      // Feature flags
      enableSignup:       v.enableSignup,
      maintenanceMode:    v.maintenanceMode,
      maintenanceMessage: v.maintenanceMessage,
    }).subscribe({
      next: () => {
        this.isSaving   = false;
        this.successMsg = '✅ Master configuration saved!';
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: (err) => {
        this.isSaving  = false;
        this.errorMsg  = err?.error?.message ?? 'Could not save configuration.';
      }
    });
  }

  f(name: string) { return this.form.get(name); }
}
