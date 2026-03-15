import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { LwMessage, LwNote, MENTOR_CHIPS } from '../learning-workspace.models';

@Component({
  selector: 'app-lw-mentor-panel',
  templateUrl: './lw-mentor-panel.component.html',
  styleUrls: ['./lw-mentor-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LwMentorPanelComponent {

  // ── Inputs ──────────────────────────────────────────────────────────────

  /** Current topic title — shown as context hint */
  @Input() topicTitle = '';

  /** AI conversation messages */
  @Input() messages: LwMessage[] = [];

  /** True while AI is generating a response */
  @Input() loading = false;

  /** Inline notes list */
  @Input() notes: LwNote[] = [];

  /** Active tab: 'mentor' | 'notes' */
  @Input() activeTab: 'mentor' | 'notes' = 'mentor';

  // ── Outputs ─────────────────────────────────────────────────────────────

  @Output() activeTabChange = new EventEmitter<'mentor' | 'notes'>();

  /** Fired when user submits the ask-input or clicks a quick-action chip */
  @Output() sendMessage = new EventEmitter<string>();

  /** Fired when user clicks "Add note" */
  @Output() addNote = new EventEmitter<string>();

  /** Fired with the index of the note to delete */
  @Output() deleteNote = new EventEmitter<number>();

  /** Fired when user wants to sync notes to the main Notes page */
  @Output() syncNotes = new EventEmitter<void>();

  // ── Internal state ───────────────────────────────────────────────────────

  askText = '';
  noteText = '';
  readonly chips = MENTOR_CHIPS;

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

  onAddNote(): void {
    const t = this.noteText.trim();
    if (!t) return;
    this.addNote.emit(t);
    this.noteText = '';
  }

  trackByIndex(i: number): number { return i; }
}
