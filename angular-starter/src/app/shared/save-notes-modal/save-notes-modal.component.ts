import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { NotesService } from '../notes.service';

export const NOTE_CATEGORIES = [
  'Frontend',
  'Backend',
  'AI / ML',
  'DevOps',
  'Architecture',
  'Databases',
  'Security',
  'Other'
] as const;

@Component({
  selector: 'app-save-notes-modal',
  templateUrl: './save-notes-modal.component.html',
  styleUrls: ['./save-notes-modal.component.css']
})
export class SaveNotesModalComponent implements OnChanges {
  @Input() isVisible: boolean = false;
  @Input() topic: string = '';
  @Input() content: string = '';

  @Output() closed = new EventEmitter<void>();
  @Output() saved  = new EventEmitter<void>();

  readonly categories = NOTE_CATEGORIES;

  editableTopic: string    = '';
  selectedCategory: string = 'Frontend';
  tags: string[]           = [];
  tagInput: string         = '';
  isSaving: boolean        = false;
  errorMessage: string     = '';

  constructor(private notesService: NotesService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['topic']) {
      this.editableTopic = this.topic;
    }
    if (changes['isVisible'] && this.isVisible) {
      this.errorMessage     = '';
      this.isSaving         = false;
      this.editableTopic    = this.topic;
      this.selectedCategory = 'Frontend';
      this.tags             = [];
      this.tagInput         = '';
    }
  }

  addTag(): void {
    const t = this.tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !this.tags.includes(t)) this.tags.push(t);
    this.tagInput = '';
  }

  addTagOnEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addTag();
    }
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter(t => t !== tag);
  }

  async save(): Promise<void> {
    if (!this.editableTopic.trim()) {
      this.errorMessage = 'Please enter a topic name.';
      return;
    }
    this.isSaving     = true;
    this.errorMessage = '';
    try {
      await this.notesService.saveNote(
        this.editableTopic.trim(),
        this.selectedCategory,
        this.content,
        this.tags
      );
      this.saved.emit();
      this.close();
    } catch (err: any) {
      this.errorMessage = err?.error?.message || 'Failed to save note. Please try again.';
    } finally {
      this.isSaving = false;
    }
  }

  close(): void {
    this.closed.emit();
  }
}
