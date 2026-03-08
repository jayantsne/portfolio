import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CustomAuthService } from '../shared/custom-auth.service';
import {
  UserConfigService, UserConfigDto, UserCustomProviderDto,
  AddCustomProviderDto, UpdateCustomProviderDto
} from '../shared/user-config.service';
import { LlmProviderService } from '../shared/llm-provider.service';

@Component({
  selector: 'app-user-settings',
  templateUrl: './user-settings.component.html',
  styleUrls:  ['./user-settings.component.css']
})
export class UserSettingsComponent implements OnInit {

  @Output() closed           = new EventEmitter<void>();
  @Output() signedOut        = new EventEmitter<void>();
  @Output() openMasterConfig = new EventEmitter<void>();

  isOpen      = false;
  isLoading   = false;
  isSaving    = false;
  saveSuccess = false;
  errorMsg    = '';

  /** Available providers this user is allowed to select (from LLM provider API). */
  availableProviders: string[] = [];

  /** Local copy of the selected provider name — drives the <select> via ngModel. */
  selectedProviderName: string = this.llmSvc.selectedProvider;

  config: UserConfigDto = {
    userId:          '',
    maxTokens:       2048,
    systemPrompt:    '',
    providerToggles: { openai: false, anthropic: false, gemini: false, groq: true, ollama: true },
    defaultProvider: 'ollama',
    customProviders: []
  };

  // ── Custom provider CRUD ──────────────────────────────────────────────────

  showAddForm      = false;
  editingId: string | null = null;        // id of provider currently being edited
  cpFormError      = '';
  cpFormSaving     = false;

  addForm: AddCustomProviderDto = { name: '', baseUrl: '', apiKey: '', model: '' };

  editForm: UpdateCustomProviderDto & { name: string; baseUrl: string; model: string } =
    { name: '', baseUrl: '', apiKey: '', model: '' };

  constructor(
    public  authSvc:   CustomAuthService,
    private configSvc: UserConfigService,
    public  llmSvc:    LlmProviderService
  ) {}

  ngOnInit(): void {}

  // ─── Open / close ─────────────────────────────────────────────────────────

  open(): void {
    this.isOpen      = true;
    this.saveSuccess = false;
    this.errorMsg    = '';
    this.showAddForm = false;
    this.editingId   = null;
    document.body.style.overflow = 'hidden';
    this.loadConfig();
  }

  close(): void {
    this.isOpen = false;
    document.body.style.overflow = '';
    this.closed.emit();
  }

  onOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('settings-overlay')) this.close();
  }

  // ─── Config ───────────────────────────────────────────────────────────────

  loadConfig(): void {
    if (!this.authSvc.isLoggedIn) return;
    this.isLoading = true;
    this.configSvc.getConfig().subscribe({
      next: c => {
        this.config = c;
        this.isLoading = false;
        // Only sync provider from DB if it is an explicit non-default value.
        // Never let a null/missing DB value overwrite a provider the user already selected.
        const dbProvider = c.defaultProvider;
        if (dbProvider && dbProvider !== 'ollama') {
          this.selectedProviderName = dbProvider;
          this.llmSvc.selectProvider(dbProvider);
        } else if (!dbProvider) {
          // DB has no value yet — keep whatever is currently selected
          this.selectedProviderName = this.llmSvc.selectedProvider;
        } else {
          // DB says ollama — only apply if nothing else is already chosen
          if (!localStorage.getItem('selected_llm_provider') || localStorage.getItem('selected_llm_provider') === 'ollama') {
            this.selectedProviderName = 'ollama';
            this.llmSvc.selectProvider('ollama');
          } else {
            this.selectedProviderName = this.llmSvc.selectedProvider;
          }
        }
      },
      error: () => { this.isLoading = false; }
    });

    // Load available LLM providers for this user
    this.llmSvc.getAvailableProviders().subscribe({
      next: r => {
        this.availableProviders = r.providers;
        // If current provider is no longer available, reset to ollama
        const allOptions = this.allProviderOptions;
        if (!allOptions.includes(this.selectedProviderName)) {
          this.selectedProviderName = 'ollama';
          this.llmSvc.selectProvider('ollama');
        }
      },
      error: () => {
        this.availableProviders = [];
        this.selectedProviderName = 'ollama';
        this.llmSvc.selectProvider('ollama');
      }
    });
  }

  save(): void {
    this.isSaving    = true;
    this.saveSuccess = false;
    this.errorMsg    = '';

    this.configSvc.updateConfig({
      maxTokens:       this.config.maxTokens,
      systemPrompt:    this.config.systemPrompt,
      providerToggles: this.config.providerToggles,
      defaultProvider: this.selectedProviderName
    }).subscribe({
      next: c => {
        this.config      = c;
        this.isSaving    = false;
        this.saveSuccess = true;
        setTimeout(() => this.saveSuccess = false, 3000);
      },
      error: err => {
        this.isSaving = false;
        this.errorMsg = err?.error?.message ?? 'Failed to save. Try again.';
      }
    });
  }

  logout(): void {
    this.authSvc.logout();
    this.close();
    this.signedOut.emit();
  }

  // ─── Provider helpers ─────────────────────────────────────────────────────

  get providerKeys(): string[] {
    return Object.keys(this.config.providerToggles);
  }

  /** All options shown in the Active AI Provider select dropdown. */
  get allProviderOptions(): string[] {
    const custom = (this.config.customProviders ?? []).map(cp => `custom:${cp.id}`);
    return ['ollama', ...this.availableProviders, ...custom];
  }

  toggleProvider(key: string): void {
    this.config.providerToggles[key] = !this.config.providerToggles[key];
  }

  selectLlmProvider(name: string): void {
    this.selectedProviderName = name;
    this.llmSvc.selectProvider(name);
    // Persist to backend
    this.configSvc.setDefaultProvider(name).subscribe({
      error: err => console.warn('[UserSettings] setDefaultProvider failed:', err)
    });
  }

  providerIcon(key: string): string {
    const map: Record<string, string> = {
      openai:    '🟢',
      anthropic: '🟤',
      gemini:    '🔵',
      groq:      '⚡',
      ollama:    '🦙'
    };
    return map[key] ?? '🤖';
  }

  displayName(providerKey: string): string {
    if (!providerKey.startsWith('custom:')) {
      return providerKey.charAt(0).toUpperCase() + providerKey.slice(1);
    }
    const id = providerKey.slice('custom:'.length);
    const cp = (this.config.customProviders ?? []).find(p => p.id === id);
    return cp ? cp.name : providerKey;
  }

  isDefaultProvider(cp: UserCustomProviderDto): boolean {
    return this.selectedProviderName === `custom:${cp.id}`;
  }

  // ─── Add custom provider ──────────────────────────────────────────────────

  openAddForm(): void {
    this.showAddForm = true;
    this.editingId   = null;
    this.cpFormError = '';
    this.addForm     = { name: '', baseUrl: '', apiKey: '', model: '' };
  }

  cancelAddForm(): void {
    this.showAddForm = false;
    this.cpFormError = '';
  }

  submitAddForm(): void {
    if (!this.addForm.name || !this.addForm.baseUrl || !this.addForm.apiKey) {
      this.cpFormError = 'Name, Base URL and API Key are required.';
      return;
    }
    this.cpFormSaving = true;
    this.cpFormError  = '';
    this.configSvc.addCustomProvider(this.addForm).subscribe({
      next: cp => {
        this.config.customProviders = [...(this.config.customProviders ?? []), cp];
        this.showAddForm  = false;
        this.cpFormSaving = false;
      },
      error: err => {
        this.cpFormSaving = false;
        this.cpFormError  = err?.error?.message ?? 'Failed to add provider.';
      }
    });
  }

  // ─── Edit custom provider ─────────────────────────────────────────────────

  openEditForm(cp: UserCustomProviderDto): void {
    this.editingId   = cp.id;
    this.showAddForm = false;
    this.cpFormError = '';
    this.editForm = { name: cp.name, baseUrl: cp.baseUrl, apiKey: '', model: cp.model };
  }

  cancelEditForm(): void {
    this.editingId   = null;
    this.cpFormError = '';
  }

  submitEditForm(id: string): void {
    this.cpFormSaving = true;
    this.cpFormError  = '';
    const dto: UpdateCustomProviderDto = {
      name:    this.editForm.name    || undefined,
      baseUrl: this.editForm.baseUrl || undefined,
      apiKey:  this.editForm.apiKey  || undefined,
      model:   this.editForm.model   || undefined
    };
    this.configSvc.updateCustomProvider(id, dto).subscribe({
      next: updated => {
        this.config.customProviders = (this.config.customProviders ?? [])
          .map(p => p.id === id ? updated : p);
        this.editingId    = null;
        this.cpFormSaving = false;
      },
      error: err => {
        this.cpFormSaving = false;
        this.cpFormError  = err?.error?.message ?? 'Failed to update provider.';
      }
    });
  }

  // ─── Delete custom provider ───────────────────────────────────────────────

  deleteCustomProvider(cp: UserCustomProviderDto): void {
    if (!confirm(`Delete custom provider "${cp.name}"? This cannot be undone.`)) return;
    this.configSvc.deleteCustomProvider(cp.id).subscribe({
      next: () => {
        this.config.customProviders = (this.config.customProviders ?? []).filter(p => p.id !== cp.id);
        // If deleted provider was selected, reset to ollama
        if (this.selectedProviderName === `custom:${cp.id}`) {
          this.selectLlmProvider('ollama');
        }
      },
      error: err => {
        this.errorMsg = err?.error?.message ?? 'Failed to delete provider.';
      }
    });
  }
}

