import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-lw-playground',
  templateUrl: './lw-playground.component.html',
  styleUrls: ['./lw-playground.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LwPlaygroundComponent {

  // ── Inputs ──────────────────────────────────────────────────────────────

  @Input() prompt = '';
  @Input() output: SafeHtml | string = '';
  @Input() loading = false;
  @Input() error = '';
  @Input() ms = 0;

  /** AI model choices to show in the selector */
  @Input() models: string[] = ['auto', 'gemini-pro', 'gpt-4o-mini'];

  @Input() selectedModel = 'auto';
  @Input() temperature = 0.7;

  // ── Outputs ─────────────────────────────────────────────────────────────

  @Output() promptChange     = new EventEmitter<string>();
  @Output() selectedModelChange = new EventEmitter<string>();
  @Output() temperatureChange   = new EventEmitter<number>();
  @Output() run   = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();

  // ── Internal ─────────────────────────────────────────────────────────────

  open = false;

  toggle(): void { this.open = !this.open; }

  onPromptChange(v: string): void {
    this.prompt = v;
    this.promptChange.emit(v);
  }

  onModelChange(v: string): void {
    this.selectedModel = v;
    this.selectedModelChange.emit(v);
  }

  onTempChange(v: number): void {
    this.temperature = v;
    this.temperatureChange.emit(v);
  }
}
