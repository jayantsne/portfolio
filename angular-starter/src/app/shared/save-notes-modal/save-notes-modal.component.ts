import {
  Component, Input, Output, EventEmitter, OnChanges, SimpleChanges,
  HostListener, ViewChild, ElementRef, AfterViewInit
} from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
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
  styleUrls: ['./save-notes-modal.component.css'],
  animations: [
    trigger('drawerSlide', [
      state('open',   style({ transform: 'translateX(0)' })),
      state('closed', style({ transform: 'translateX(100%)' })),
      transition('closed => open',  animate('280ms cubic-bezier(.22,.61,.36,1)')),
      transition('open => closed',  animate('220ms cubic-bezier(.55,.0,1,.45)')),
    ]),
    trigger('overlayFade', [
      state('open',   style({ opacity: 1 })),
      state('closed', style({ opacity: 0 })),
      transition('closed => open',  animate('200ms ease')),
      transition('open => closed',  animate('200ms ease')),
    ])
  ]
})
export class SaveNotesModalComponent implements OnChanges {
  @Input() isVisible: boolean = false;
  @Input() topic: string = '';
  @Input() content: string = '';
  @Input() contextType?: string;
  @Input() contextId?: string;

  @Output() closed = new EventEmitter<void>();
  @Output() saved  = new EventEmitter<void>();

  @ViewChild('titleInput') titleInputRef!: ElementRef<HTMLInputElement>;

  readonly categories = NOTE_CATEGORIES;

  editableTopic:    string   = '';
  editableContent:  string   = '';
  selectedCategory: string   = 'Frontend';
  tags:             string[] = [];
  tagInput:         string   = '';
  isSaving:         boolean  = false;
  errorMessage:     string   = '';
  /** Drives animation state — stays 'open' so the close animation plays before *ngIf removes it */
  drawerState: 'open' | 'closed' = 'closed';
  /** Controls *ngIf — set false only after close animation finishes */
  rendered = false;

  constructor(private notesService: NotesService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isVisible']) {
      if (this.isVisible) {
        this.rendered       = true;
        this.errorMessage   = '';
        this.isSaving       = false;
        this.editableTopic  = this.topic;
        this.editableContent = this.content;
        this.selectedCategory = this.detectCategory(this.topic);
        this.tags             = [];
        this.tagInput         = '';
        // Delay so *ngIf renders the DOM before animation starts
        setTimeout(() => {
          this.drawerState = 'open';
          setTimeout(() => this.titleInputRef?.nativeElement?.focus(), 50);
        }, 10);
      } else {
        this.drawerState = 'closed';
      }
    }
    if (changes['topic'] && !changes['isVisible']) {
      this.editableTopic = this.topic;
    }
    if (changes['content'] && !changes['isVisible']) {
      this.editableContent = this.content;
    }
  }

  /** Close animation done — remove from DOM */
  onDrawerDone(event: any): void {
    if (event.toState === 'closed') {
      this.rendered = false;
    }
  }

  /** Detect likely category from topic name */
  private detectCategory(topic: string): string {
    const t = topic.toLowerCase();
    if (/promise|async|await|js|javascript|typescript|css|html|react|angular|vue|node/.test(t)) return 'Frontend';
    if (/api|rest|graphql|c#|dotnet|java|python|sql|db|database|mongo|postgres/.test(t)) return 'Backend';
    if (/ai|ml|neural|llm|gpt|machine|deep|learning|model/.test(t)) return 'AI / ML';
    if (/docker|k8s|kubernetes|deploy|ci|cd|pipeline|nginx/.test(t)) return 'DevOps';
    if (/arch|design|pattern|solid|microservice|event/.test(t)) return 'Architecture';
    if (/sql|mongo|redis|postgres|mysql|index|query|db/.test(t)) return 'Databases';
    if (/auth|jwt|oauth|security|xss|csrf|encrypt/.test(t)) return 'Security';
    return 'Frontend';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isVisible) this.close();
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
        this.editableContent,
        this.tags,
        this.contextType,
        this.contextId,
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
