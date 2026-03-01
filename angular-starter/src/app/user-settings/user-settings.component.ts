import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CustomAuthService } from '../shared/custom-auth.service';
import { UserConfigService, UserConfigDto } from '../shared/user-config.service';

@Component({
  selector: 'app-user-settings',
  templateUrl: './user-settings.component.html',
  styleUrls:  ['./user-settings.component.css']
})
export class UserSettingsComponent implements OnInit {

  @Output() closed         = new EventEmitter<void>();
  @Output() signedOut       = new EventEmitter<void>();
  @Output() openMasterConfig = new EventEmitter<void>();

  isOpen      = false;
  isLoading   = false;
  isSaving    = false;
  saveSuccess = false;
  errorMsg    = '';

  config: UserConfigDto = {
    userId:          '',
    maxTokens:       2048,
    systemPrompt:    '',
    providerToggles: { openai: false, anthropic: false, gemini: false, groq: true, ollama: true }
  };

  constructor(
    public  authSvc:       CustomAuthService,
    private configSvc:     UserConfigService
  ) {}

  ngOnInit(): void {}

  // ─── Open / close ─────────────────────────────────────────────────────────

  open(): void {
    this.isOpen     = true;
    this.saveSuccess = false;
    this.errorMsg   = '';
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
      next:  c => { this.config = c; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  save(): void {
    this.isSaving    = true;
    this.saveSuccess = false;
    this.errorMsg    = '';

    this.configSvc.updateConfig({
      maxTokens:       this.config.maxTokens,
      systemPrompt:    this.config.systemPrompt,
      providerToggles: this.config.providerToggles
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

  toggleProvider(key: string): void {
    this.config.providerToggles[key] = !this.config.providerToggles[key];
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
}
