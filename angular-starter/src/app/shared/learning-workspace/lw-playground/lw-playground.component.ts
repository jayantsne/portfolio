import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, OnChanges, SimpleChanges,
} from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';

export type PgMode = 'run' | 'explain' | 'debug' | 'optimize' | 'comments' | 'challenge';

@Component({
  selector: 'app-lw-playground',
  templateUrl: './lw-playground.component.html',
  styleUrls: ['./lw-playground.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LwPlaygroundComponent implements OnChanges {

  // ── Inputs ──────────────────────────────────────────────────────────────

  /** Code editor content (two-way bindable via codeChange output) */
  @Input() code = '';

  /** Incrementing counter: when it changes, the panel auto-opens (use for external code injection) */
  @Input() loadToken = 0;

  /** AI-rendered output */
  @Input() output: SafeHtml | string = '';

  /** True while the AI request is in-flight */
  @Input() loading = false;

  /** Error message (non-empty = show error state) */
  @Input() error = '';

  /** Time taken for last request in ms */
  @Input() ms = 0;

  /** Active roadmap language (e.g. "Machine Learning", "Python") */
  @Input() language = '';

  /** Current lesson topic title */
  @Input() topicTitle = '';

  /**
   * Code snippets extracted from the current lesson.
   * When populated the "Load lesson code" button appears.
   */
  @Input() lessonCodeBlocks: string[] = [];

  // ── Outputs ─────────────────────────────────────────────────────────────

  @Output() codeChange   = new EventEmitter<string>();

  /**
   * Fired when the user clicks Run / an AI action / Practice.
   * Payload: { code, mode } — parent handles the AI call.
   */
  @Output() run    = new EventEmitter<{ code: string; mode: PgMode }>();
  @Output() reset  = new EventEmitter<void>();

  /** Fired when user saves to Notes — payload is the note text */
  @Output() saveNote = new EventEmitter<string>();

  // ── Internal state ───────────────────────────────────────────────────────

  open  = false;
  aiMode: PgMode | null = null;

  /** Index of the lesson code block currently loaded */
  currentBlockIndex = 0;

  /** Counts notes saved this session */
  savedCount = 0;

  /** Brief flash after saving */
  justSaved = false;
  private savedTimer: any = null;

  // ── Lifecycle ────────────────────────────────────────────────────────────

  ngOnChanges(changes: SimpleChanges): void {
    // When parent pushes new lesson code blocks, reset index
    if (changes['lessonCodeBlocks'] && this.lessonCodeBlocks.length) {
      this.currentBlockIndex = 0;
    }
    // Open and scroll into view whenever the parent injects external code
    if (changes['loadToken'] && !changes['loadToken'].firstChange) {
      this.open = true;
    }
  }

  // ── Toggle ───────────────────────────────────────────────────────────────

  toggle(): void { this.open = !this.open; }

  // ── Code editor helpers ──────────────────────────────────────────────────

  onCodeChange(v: string): void {
    this.code = v;
    this.codeChange.emit(v);
  }

  clearCode(): void {
    this.code = '';
    this.codeChange.emit('');
  }

  clearOutput(): void {
    this.reset.emit();
  }

  // ── Lesson code block loading ────────────────────────────────────────────

  loadFromLesson(): void {
    if (!this.lessonCodeBlocks.length) return;
    const block = this.lessonCodeBlocks[this.currentBlockIndex] ?? '';
    this.code = block;
    this.codeChange.emit(block);
    this.open = true;
  }

  prevBlock(): void {
    if (this.currentBlockIndex > 0) {
      this.currentBlockIndex--;
      this.loadFromLesson();
    }
  }

  nextBlock(): void {
    if (this.currentBlockIndex < this.lessonCodeBlocks.length - 1) {
      this.currentBlockIndex++;
      this.loadFromLesson();
    }
  }

  // ── AI actions ───────────────────────────────────────────────────────────

  doRun(mode: PgMode): void {
    if ((!this.code.trim() && mode !== 'challenge') || this.loading) return;
    this.aiMode = mode;
    this.open   = true;
    this.run.emit({ code: this.code, mode });
  }

  // ── Save to notes ────────────────────────────────────────────────────────

  saveAsNote(): void {
    const text = this.output?.toString().trim();
    if (!text) return;
    const noteText =
      `**AI Code Lab — ${this.topicTitle || this.language}**\n\n` +
      `**Mode:** ${this.aiModeLabel}\n\n` +
      `**Code:**\n\`\`\`\n${this.code}\n\`\`\`\n\n` +
      `**Result:**\n${text.replace(/<[^>]+>/g, '')}`;
    this.saveNote.emit(noteText);
    this.savedCount++;
    this.justSaved = true;
    clearTimeout(this.savedTimer);
    this.savedTimer = setTimeout(() => { this.justSaved = false; }, 2400);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  get aiModeLabel(): string {
    switch (this.aiMode) {
      case 'run':       return '▶ Run output';
      case 'explain':   return '🔍 Explanation';
      case 'debug':     return '🐛 Debug report';
      case 'optimize':  return '⚡ Optimized code';
      case 'comments':  return '💬 Commented code';
      case 'challenge': return '🎯 Practice challenge';
      default:          return '';
    }
  }

  trackByIndex(i: number): number { return i; }
}
