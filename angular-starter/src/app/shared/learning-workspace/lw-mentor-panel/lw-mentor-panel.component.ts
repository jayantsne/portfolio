import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, OnChanges, SimpleChanges,
} from '@angular/core';
import { LwMessage, LwNote, MENTOR_CHIPS } from '../learning-workspace.models';

/** Note stored in localStorage for a specific lesson */
export interface LocalLessonNote {
  id: string;
  lessonId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

@Component({
  selector: 'app-lw-mentor-panel',
  templateUrl: './lw-mentor-panel.component.html',
  styleUrls: ['./lw-mentor-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LwMentorPanelComponent implements OnChanges {

  // ── Inputs ──────────────────────────────────────────────────────────────

  /** Current topic title — shown as context hint */
  @Input() topicTitle = '';

  /** AI conversation messages (kept for backward compat — NOT rendered in sidebar) */
  @Input() messages: LwMessage[] = [];

  /** True while AI is generating a response */
  @Input() loading = false;

  /** Legacy notes passed from parent (ignored — we use localNotes instead) */
  @Input() notes: LwNote[] = [];

  /** Active tab: 'mentor' | 'notes' */
  @Input() activeTab: 'mentor' | 'notes' = 'mentor';

  /** Lesson ID used as localStorage key — set this whenever the lesson changes */
  @Input() lessonId = '';

  // ── Outputs ─────────────────────────────────────────────────────────────

  @Output() activeTabChange = new EventEmitter<'mentor' | 'notes'>();

  /** Fired when user submits the ask-input or clicks a quick-action chip */
  @Output() sendMessage = new EventEmitter<string>();

  /** Fired when user clicks "Add note" (for backward-compat parent listeners) */
  @Output() addNote = new EventEmitter<string>();

  /** Fired with the index of the note to delete (backward compat) */
  @Output() deleteNote = new EventEmitter<number>();

  /** Fired when user wants to sync notes to the main Notes page */
  @Output() syncNotes = new EventEmitter<void>();

  // ── Internal state ───────────────────────────────────────────────────────

  askText  = '';
  noteText = '';
  readonly chips = MENTOR_CHIPS;

  /** Notes loaded from localStorage for the current lesson */
  localNotes: LocalLessonNote[] = [];

  /** Index of the note currently being edited (-1 = none) */
  editingIndex = -1;
  editText = '';

  // ── Lifecycle ────────────────────────────────────────────────────────────

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['lessonId'] && this.lessonId) {
      this.editingIndex = -1;
      this.editText     = '';
      this.loadNotes();
    }
  }

  // ── LocalStorage helpers ──────────────────────────────────────────────────

  private storageKey(): string {
    return `notes_${this.lessonId}`;
  }

  private loadNotes(): void {
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        this.localNotes = parsed.map(n => ({
          ...n,
          createdAt: new Date(n.createdAt),
          updatedAt: new Date(n.updatedAt),
        }));
      } else {
        this.localNotes = [];
      }
    } catch {
      this.localNotes = [];
    }
  }

  private saveNotes(): void {
    try {
      localStorage.setItem(this.storageKey(), JSON.stringify(this.localNotes));
    } catch { /* quota exceeded — silently ignore */ }
  }

  // ── Note CRUD ────────────────────────────────────────────────────────────

  addNoteLocal(): void {
    const content = this.noteText.trim();
    if (!content) return;
    const now = new Date();
    const note: LocalLessonNote = {
      id:        `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      lessonId:  this.lessonId,
      content,
      createdAt: now,
      updatedAt: now,
    };
    this.localNotes = [note, ...this.localNotes];
    this.saveNotes();
    this.noteText = '';
    // Also emit for parent listeners that may sync to the API Notes page
    this.addNote.emit(content);
  }

  deleteNoteLocal(index: number): void {
    this.localNotes = this.localNotes.filter((_, i) => i !== index);
    this.saveNotes();
    if (this.editingIndex === index) { this.editingIndex = -1; this.editText = ''; }
  }

  startEdit(index: number): void {
    this.editingIndex = index;
    this.editText     = this.localNotes[index].content;
  }

  saveEdit(index: number): void {
    const content = this.editText.trim();
    if (!content) return;
    this.localNotes = this.localNotes.map((n, i) =>
      i === index ? { ...n, content, updatedAt: new Date() } : n
    );
    this.saveNotes();
    this.editingIndex = -1;
    this.editText     = '';
  }

  cancelEdit(): void {
    this.editingIndex = -1;
    this.editText     = '';
  }

  // ── Tab / chip / send helpers ─────────────────────────────────────────────

  setTab(tab: 'mentor' | 'notes'): void {
    this.activeTab = tab;
    this.activeTabChange.emit(tab);
  }

  onChip(prompt: string): void {
    if (this.loading) return;
    this.sendMessage.emit(prompt);
  }

  onSend(): void {
    const t = this.askText.trim();
    if (!t || this.loading) return;
    this.sendMessage.emit(t);
    this.askText = '';
  }

  /** Legacy — kept so parent (addNote) handlers still work */
  onAddNote(): void { this.addNoteLocal(); }

  trackByIndex(i: number): number { return i; }
  trackById(_i: number, note: LocalLessonNote): string { return note.id; }
}
