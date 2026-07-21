import { Component, OnInit, OnDestroy, HostListener, NgZone, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { trigger, transition, style, animate } from '@angular/animations';
import { Router, ActivatedRoute } from '@angular/router';
import { ShareDraftService } from '../shared/share-draft.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CustomAuthService, AuthUser } from '../shared/custom-auth.service';
import { NotesService, SavedNote } from '../shared/notes.service';
import { NOTE_CATEGORIES } from '../shared/save-notes-modal/save-notes-modal.component';
import { AI_BACKEND } from '../config/ai.config';
import { AILearnService } from '../services/ai-learn.service';
import { TiptapEditorComponent } from '../shared/tiptap-editor/tiptap-editor.component';
import { NoteFormatterService } from '../shared/note-formatter.service';

interface NoteBreakdown {
  title:    string;
  summary:  string;
  sections: Array<{ heading: string; content: string; bullets?: string[]; example?: string }>;
  steps:    string[];
  visual:   { type: string; data: string } | null;
}

@Component({
  selector: 'app-notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.css'],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('260ms ease', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
      transition(':leave', [
        animate('180ms ease', style({ opacity: 0, transform: 'translateY(-6px)' })),
      ]),
    ]),
    trigger('stepAnim', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-16px)' }),
        animate('350ms cubic-bezier(0.4,0,0.2,1)', style({ opacity: 1, transform: 'translateX(0)' })),
      ]),
    ]),
  ],
})
export class NotesComponent implements OnInit, OnDestroy {
  user: AuthUser | null = null;
  notes: SavedNote[] = [];
  activeNote: SavedNote | null = null;
  isLoading   = false;
  deletingId: string | null = null;

  // ── Filters ──────────────────────────────────────────────────────────────
  filterCategory     = 'All';
  filterTag          = '';
  showAllTags        = false;
  filtersOpen        = false;
  readonly TAG_VISIBLE_LIMIT = 5;

  // Search with debounce
  private _searchQuery   = '';
  private searchSubject$ = new Subject<string>();
  get searchQuery(): string { return this._searchQuery; }
  set searchQuery(v: string) {
    this._searchQuery = v;  // update immediately for the input value
    this.searchSubject$.next(v);
  }
  private _filterQuery = '';  // debounced value used for filtering

  // ── Edit mode ─────────────────────────────────────────────────────────────
  editMode       = false;
  isUpdating     = false;
  editTopic      = '';
  editCategory   = 'Other';
  editTags: string[] = [];
  editTagInput   = '';
  editContent    = '';
  appendText     = '';
  updateError    = '';

  // ── Create Note mode ──────────────────────────────────────────────────────
  createMode         = false;
  createTopic        = '';
  createCategory     = 'Frontend';
  createTags: string[] = [];
  createTagInput     = '';
  createContent      = '';
  preAIContent: string | null = null;  // undo buffer
  isFormatting       = false;
  isSavingNew        = false;
  createSaveSuccess  = false;
  createPreviewMode  = false;   // toggle edit ↔ preview
  createError        = '';
  private formatXhr: XMLHttpRequest | null = null;

  // ── Mobile Reader ────────────────────────────────────────────────────────
  mobileReaderOpen    = false;
  sidebarCollapsed    = false;
  showPinnedOnly      = false;
  showMoreMenu        = false;
  showFabMenu         = false;
  showAiActions    = false;
  aiDrawerOpen     = false;   // desktop floating AI assistant drawer
  aiActionLoading  = false;
  aiActionResult   = '';
  aiActionError    = '';
  private aiXhr: XMLHttpRequest | null = null;

  // ── Text-selection floating menu ─────────────────────────────────────────
  showSelectionMenu  = false;
  selectionMenuPos   = { x: 0, y: 0 };
  selectionMenuText  = '';

  // ── Desktop AI panel ─────────────────────────────────────────────────────
  showExportMenu             = false;
  aiAskQuery                 = '';
  aiGroupOpen: string | null = null;

  // ── AI streaming sub ──────────────────────────────────────────────────
  private aiStreamSub: Subscription | null = null;
  aiActionStreaming = false;        // true while SSE is in flight
  aiTagSuggestions: string[] = [];  // tags suggested by AI
  aiSavedToNote    = false;         // success toast

  // ── Mobile Editor ───────────────────────────────────────────────────
  mobileEditorOpen    = false;
  meFormatLoading     = false;
  mePreFormatContent: string | null = null;
  private meXhr: XMLHttpRequest | null = null;
  autoFormatEnabled   = false;
  private mePasteTimer: any  = null;
  private cnPasteTimer: any  = null;

  // ── Tiptap editor references ─────────────────────────────────────────────
  /** Rich-text editor for the Create Note panel */
  @ViewChild('cnTiptap') cnTiptap?: TiptapEditorComponent;
  /** Rich-text editor for the desktop Edit Note panel */
  @ViewChild('editTiptap') editTiptap?: TiptapEditorComponent;
  /** Main desktop reader surface, focused when a note opens from the sidebar. */
  @ViewChild('readerPanel') readerPanel?: ElementRef<HTMLElement>;
  /** Title field in the create-note workspace. */
  @ViewChild('createTitleInput') createTitleInput?: ElementRef<HTMLInputElement>;

  // ── Delete flow ─────────────────────────────────────────────────────────
  deleteModal: SavedNote | null = null;   // note awaiting modal confirmation
  isDeleting                    = false;  // spinner inside modal
  pendingDeleteId: string | null = null;  // list-item inline confirm
  undoPending: { note: SavedNote; timer: ReturnType<typeof setTimeout> } | null = null;

  readonly categories = NOTE_CATEGORIES;

  // ── AI Learning Mode state ────────────────────────────────────
  viewMode: 'read' | 'breakdown' | 'steps' = 'read';
  breakdownLoading  = false;
  breakdownError    = false;
  breakdownData: NoteBreakdown | null = null;
  breakdownOpenSection: number | null = null;
  private breakdownNoteId: string | null = null;
  stepIndex         = 0;
  stepsAutoPlaying  = false;
  private stepsTimer: any;

  // ── Toast notifications ──────────────────────────────────────────────────
  toast: { msg: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any;

  showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    clearTimeout(this.toastTimer);
    this.toast = { msg, type };
    this.toastTimer = setTimeout(() => { this.toast = null; }, 3000);
  }

  // ── Pinned notes (server-persisted via PATCH /api/notes/{id}/pin) ─────────
  isPinned(note: SavedNote): boolean { return note.isPinned === true; }

  async togglePin(note: SavedNote): Promise<void> {
    if (!note.id) return;
    // Optimistic update
    note.isPinned = !note.isPinned;
    try {
      await this.notesService.togglePin(note.id);
    } catch {
      // Revert on error
      note.isPinned = !note.isPinned;
      this.showToast('Could not update pin state.', 'error');
    }
  }

  // ── Word count / reading time ──────────────────────────────────────────
  noteWordCount(note: SavedNote | null): number {
    if (!note) return 0;
    return note.content.trim().split(/\s+/).filter(w => w.length > 0).length;
  }
  noteReadingTime(note: SavedNote | null): string {
    const wpm = 200;
    const mins = Math.ceil(this.noteWordCount(note) / wpm);
    return mins <= 1 ? '< 1 min read' : `${mins} min read`;
  }

  get createWordCount(): number {
    const text = this.createContent
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .trim();
    return text ? text.split(/\s+/).filter(Boolean).length : 0;
  }

  private readonly subs: Subscription[] = [];
  private pendingRouteSearch = '';
  private pendingRouteNoteId = '';

  // ── Share-to-Notes draft ────────────────────────────────────────────────
  private _pendingDraftOpen = false;
  get shareDraftCount(): number { return this.draft.lineCount(); }
  get hasPendingDraft(): boolean { return this.draft.hasDraft(); }

  constructor(
    private authSvc:        CustomAuthService,
    private notesService:   NotesService,
    private router:         Router,
    private route:          ActivatedRoute,
    private draft:          ShareDraftService,
    private aiSvc:          AILearnService,
    private http:           HttpClient,
    private zone:           NgZone,
    private noteFormatter:  NoteFormatterService,
  ) {}

  ngOnInit(): void {
    // On mobile, collapse the sidebar by default so the content area shows first
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      this.sidebarCollapsed = true;
    }

    this.user = this.authSvc.currentUser;
    if (this.user) { this.startLoadingNotes(); }

    // Pick up Web Share Target draft (openDraft=1 query param)
    const openDraft = this.route.snapshot.queryParamMap.get('openDraft');
    this.pendingRouteSearch = this.route.snapshot.queryParamMap.get('search') ?? '';
    this.pendingRouteNoteId = this.route.snapshot.queryParamMap.get('noteId') ?? '';
    if (this.pendingRouteSearch) {
      this.searchQuery = this.pendingRouteSearch;
      this._filterQuery = this.pendingRouteSearch;
    }
    if (openDraft === '1' && this.draft.hasDraft()) {
      if (this.user) {
        const content = this.draft.buildContent();
        this.openCreateNote();
        this.createContent = content;
      } else {
        this._pendingDraftOpen = true;
      }
    }

    // Debounce search so the list doesn't re-filter on every keystroke
    this.subs.push(
      this.searchSubject$.pipe(debounceTime(250), distinctUntilChanged()).subscribe((q: string) => {
        this._filterQuery = q;
      })
    );

    this.subs.push(
      this.authSvc.currentUser$.subscribe(user => {
        const wasNull = !this.user;
        this.user = user;
        if (user && wasNull) {
          this.startLoadingNotes();
          if (this._pendingDraftOpen && this.draft.hasDraft()) {
            this._pendingDraftOpen = false;
            setTimeout(() => {
              const content = this.draft.buildContent();
              this.openCreateNote();
              this.createContent = content;
            }, 300);
          }
        } else if (!user) {
          this.isLoading = false;
          this.notes     = [];
          this.activeNote = null;
          this.editMode  = false;
          // User logged out while on this protected page — navigate away
          this.router.navigate(['/'], { queryParams: { login: 'required', returnUrl: '/notes' } });
        }
      })
    );
  }

  private startLoadingNotes(): void {
    this.isLoading = true;
    this.subs.push(
      this.notesService.notes$.subscribe(notes => {
        this.notes = notes;
        this.isLoading = false;
        this.applyPendingRouteNote();
        if (this.activeNote) {
          const refreshed = notes.find(n => n.id === this.activeNote!.id);
          this.activeNote = refreshed ?? null;
          if (this.editMode && !this.activeNote) this.editMode = false;
        }
      })
    );
  }

  private applyPendingRouteNote(): void {
    if (this.pendingRouteNoteId) {
      const note = this.notes.find(n => n.id === this.pendingRouteNoteId);
      if (note) {
        this.pendingRouteNoteId = '';
        this.openNote(note);
        return;
      }
    }

    if (this.pendingRouteSearch && !this.activeNote) {
      const q = this.pendingRouteSearch.toLowerCase();
      const note = this.notes.find(n =>
        n.topic.toLowerCase().includes(q) ||
        q.includes(n.topic.toLowerCase())
      );
      if (note) {
        this.openNote(note);
      }
    }
  }

  ngOnDestroy(): void {
    this.setCreatePageLock(false);
    this.subs.forEach(s => s.unsubscribe());
    this.aiStreamSub?.unsubscribe();
    this.formatXhr?.abort();
    this.aiXhr?.abort();
    this.meXhr?.abort();
    clearTimeout(this.toastTimer);
    if (this.undoPending) clearTimeout(this.undoPending.timer);
    this.stopAutoPlay();
  }

  // ── AI Learning Mode methods ────────────────────────────────────

  setViewMode(mode: 'read' | 'breakdown' | 'steps'): void {
    this.viewMode = mode;
    if (mode === 'steps') {
      this.stepIndex = 0;
      this.stopAutoPlay();
    }
    if ((mode === 'breakdown' || mode === 'steps')
        && !this.breakdownData && !this.breakdownLoading) {
      this.loadBreakdown();
    }
  }

  loadBreakdown(): void {
    if (!this.activeNote) return;
    this.breakdownLoading = true;
    this.breakdownError   = false;
    this.breakdownNoteId  = this.activeNote.id ?? null;
    const base = window.location.hostname === 'localhost' ? '' : 'https://learnwithai.tech';
    this.http.post<NoteBreakdown>(`${base}/api/ai/structured`,
      { topic: this.activeNote.topic, maxTokens: 1500 })
      .subscribe({
        next: data => { this.breakdownData = data; this.breakdownLoading = false; },
        error: ()   => { this.breakdownError = true; this.breakdownLoading = false; },
      });
  }

  get breakdownSteps(): string[] { return this.breakdownData?.steps ?? []; }

  get stepProgress(): number {
    const t = this.breakdownSteps.length;
    return t === 0 ? 0 : Math.round(((this.stepIndex + 1) / t) * 100);
  }

  nextStep(): void {
    if (this.stepIndex < this.breakdownSteps.length - 1) this.stepIndex++;
    else this.stopAutoPlay();
  }

  prevStep(): void { if (this.stepIndex > 0) this.stepIndex--; }

  toggleAutoPlay(): void { this.stepsAutoPlaying ? this.stopAutoPlay() : this.startAutoPlay(); }

  private startAutoPlay(): void {
    this.stepsAutoPlaying = true;
    this.stepsTimer = setInterval(() => {
      if (this.stepIndex < this.breakdownSteps.length - 1) { this.stepIndex++; }
      else { this.stopAutoPlay(); }
    }, 2500);
  }

  private stopAutoPlay(): void {
    this.stepsAutoPlaying = false;
    clearInterval(this.stepsTimer);
  }

  toggleBreakdownSection(i: number): void {
    this.breakdownOpenSection = this.breakdownOpenSection === i ? null : i;
  }

  // ── Derived lists ─────────────────────────────────────────────────────────

  get allCategories(): string[] {
    const cats = new Set(this.notes.map(n => n.category || 'Other'));
    return ['All', ...Array.from(cats).sort()];
  }

  get allTags(): string[] {
    const set = new Set<string>();
    this.notes.forEach(n => (n.tags ?? []).forEach(t => set.add(t)));
    return Array.from(set).sort();
  }

  get visibleTags(): string[] {
    return this.showAllTags ? this.allTags : this.allTags.slice(0, this.TAG_VISIBLE_LIMIT);
  }

  get hasActiveFilter(): boolean {
    return this.filterCategory !== 'All' || this.filterTag !== '' || this.showPinnedOnly;
  }

  get pinnedNotes(): SavedNote[] {
    return this.notes.filter(n => n.isPinned === true);
  }

  get categoryCounts(): Array<{ category: string; count: number }> {
    const counts = new Map<string, number>();
    for (const note of this.notes) {
      const category = note.category || 'Other';
      counts.set(category, (counts.get(category) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }

  get filteredNotes(): SavedNote[] {
    const q = this._filterQuery.trim().toLowerCase();
    const result = this.notes.filter(n => {
      const matchesCat = this.filterCategory === 'All' ||
                         (n.category || 'Other') === this.filterCategory;
      const matchesTag = !this.filterTag ||
                         (n.tags ?? []).includes(this.filterTag);
      const matchesSearch = !q ||
        n.topic.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.tags ?? []).some(t => t.includes(q));
      const matchesPinned = !this.showPinnedOnly || n.isPinned === true;
      return matchesCat && matchesTag && matchesSearch && matchesPinned;
    });
    // Pinned notes float to the top
    return [
      ...result.filter(n => n.isPinned === true),
      ...result.filter(n => n.isPinned !== true),
    ];
  }

  get groupedNotes(): { category: string; notes: SavedNote[] }[] {
    const map = new Map<string, SavedNote[]>();
    for (const note of this.filteredNotes) {
      const cat = note.category || 'Other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(note);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, notes]) => ({ category, notes }));
  }

  // ── Note actions ────────────────────────────────────────────────────────

  openNote(note: SavedNote): void {
    this.activeNote       = note;
    this.viewMode         = 'read';
    this.editMode         = false;
    this.updateError      = '';
    if (note.id !== this.breakdownNoteId) {
      this.breakdownData  = null;
      this.breakdownError = false;
    }
    this.stepIndex        = 0;
    this.stopAutoPlay();
    this.mobileReaderOpen = true;
    this.showMoreMenu     = false;
    this.showAiActions    = false;
    this.aiActionResult   = '';
    this.aiActionError    = '';
    setTimeout(() => this.readerPanel?.nativeElement.focus({ preventScroll: true }));
  }

  closeNote(): void {
    this.activeNote = null;
    this.editMode   = false;
  }

  closeMobileReader(): void {
    this.mobileReaderOpen = false;
    this.showAiActions    = false;
    this.aiActionResult   = '';
    this.aiActionError    = '';
    this.showMoreMenu     = false;
    this.showFabMenu      = false;
    this.activeNote       = null;
    this.editMode         = false;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  openNotesDrawer(): void {
    this.sidebarCollapsed = false;
  }

  focusNotesSearch(): void {
    this.sidebarCollapsed = false;
    setTimeout(() => document.getElementById('notes-library-search')?.focus(), 0);
  }

  openTopicsFilter(): void {
    this.sidebarCollapsed = false;
    this.filtersOpen = true;
  }

  togglePinnedNotes(): void {
    this.showPinnedOnly = !this.showPinnedOnly;
    this.sidebarCollapsed = false;
  }

  openMobileEditor(): void {
    if (!this.activeNote) return;
    this.editTopic          = this.activeNote.topic;
    this.editCategory       = this.activeNote.category || 'Other';
    this.editTags           = [...(this.activeNote.tags ?? [])];
    this.editContent        = this.activeNote.content;
    this.appendText         = '';
    this.updateError        = '';
    this.mePreFormatContent = null;
    this.meFormatLoading    = false;
    this.mobileEditorOpen   = true;
    this.mobileReaderOpen   = false;
    this.showMoreMenu       = false;
    this.showFabMenu        = false;
  }

  closeMobileEditor(backToReader = true): void {
    this.mobileEditorOpen = false;
    this.editMode         = false;
    this.meXhr?.abort();
    this.meFormatLoading  = false;
    this.updateError      = '';
    if (backToReader && this.activeNote) this.mobileReaderOpen = true;
  }

  undoMeFormat(): void {
    if (this.mePreFormatContent !== null) {
      this.editTiptap?.setContent(this.mePreFormatContent);
      this.editContent        = this.mePreFormatContent;
      this.mePreFormatContent = null;
    }
  }

  /** Paste handler for mobile editor — debounces AI format 700 ms after paste if auto-format is on */
  onMobileEditorPaste(_event: ClipboardEvent): void {
    if (!this.autoFormatEnabled) return;
    clearTimeout(this.mePasteTimer);
    this.mePasteTimer = setTimeout(() => {
      if (this.editContent.trim() && !this.meFormatLoading) {
        this.formatMobileWithAI();
      }
    }, 700);
  }

  /** Paste handler for create-note editor — same debounce pattern */
  onCreateNotePaste(_event: ClipboardEvent): void {
    if (!this.autoFormatEnabled) return;
    clearTimeout(this.cnPasteTimer);
    this.cnPasteTimer = setTimeout(() => {
      const hasContent = this.cnTiptap ? !this.cnTiptap.isEmpty() : !!this.createContent.trim();
      if (hasContent && !this.isFormatting) {
        this.formatNoteWithAI();
      }
    }, 700);
  }

  /**
   * Client-side fallback formatter — wraps recognized code lines in fenced blocks.
   * Called when AI is unreachable. NEVER changes wording; only adds markdown structure.
   */
  private fallbackFormat(text: string): string {
    const CODE_START = /^\s*(let|const|var|function|class|if\s*\(|for\s*\(|while\s*\(|return\s|import\s|export\s|def\s|async\s|print\s*\(|console\.|#include|void\s|int\s|public\s|private\s)\b/;
    const CODE_CONT  = /[{};]$|^\s*\/\//;
    const lines = text.split('\n');
    const out: string[] = [];
    let buf: string[] = [];

    const flush = () => {
      if (!buf.length) return;
      const isPy = buf.some(l => /\bdef\b|\bprint\b/.test(l));
      out.push('```' + (isPy ? 'python' : 'javascript'), ...buf, '```');
      buf = [];
    };

    for (const line of lines) {
      if (CODE_START.test(line.trim()) || (buf.length > 0 && CODE_CONT.test(line.trim()))) {
        buf.push(line);
      } else {
        flush();
        out.push(line);
      }
    }
    flush();
    return out.join('\n');
  }

  insertMdSyntax(textarea: HTMLTextAreaElement, type: string): void {
    const start  = textarea.selectionStart;
    const end    = textarea.selectionEnd;
    const sel    = this.editContent.substring(start, end);
    const before = this.editContent.substring(0, start);
    const after  = this.editContent.substring(end);
    const map: Record<string, string> = {
      bullet:    `\n- ${sel || 'Item'}`,
      checklist: `\n- [ ] ${sel || 'Task'}`,
      bold:      `**${sel || 'bold text'}**`,
      heading:   `\n## ${sel || 'Heading'}`,
      code:      `\n\`\`\`\n${sel || 'code here'}\n\`\`\``,
    };
    const insert = map[type] || '';
    this.editContent = before + insert + after;
    setTimeout(() => {
      textarea.focus();
      const pos = (before + insert).length;
      textarea.setSelectionRange(pos, pos);
    }, 10);
  }

  insertCreateSyntax(textarea: HTMLTextAreaElement, type: string): void {
    const start  = textarea.selectionStart;
    const end    = textarea.selectionEnd;
    const sel    = this.createContent.substring(start, end);
    const before = this.createContent.substring(0, start);
    const after  = this.createContent.substring(end);
    const map: Record<string, string> = {
      bullet:    `\n- ${sel || 'Item'}`,
      checklist: `\n- [ ] ${sel || 'Task'}`,
      bold:      `**${sel || 'bold text'}**`,
      heading:   `\n## ${sel || 'Heading'}`,
      code:      `\n\`\`\`\n${sel || 'code here'}\n\`\`\``,
    };
    const insert = map[type] || '';
    this.createContent = before + insert + after;
    setTimeout(() => {
      textarea.focus();
      const pos = (before + insert).length;
      textarea.setSelectionRange(pos, pos);
    }, 10);
  }

  /**
   * Format the edit-note editor content instantly using the local
   * NoteFormatterService — works for both Tiptap (HTML) and plain-text textarea.
   */
  formatMobileWithAI(): void {
    const isTiptap    = !!this.editTiptap;
    const currentHtml = isTiptap ? this.editTiptap!.getHTML() : this.editContent;
    const isEmpty     = isTiptap ? this.editTiptap!.isEmpty() : !this.editContent.trim();

    if (isEmpty) return;

    this.mePreFormatContent = currentHtml;
    this.updateError        = '';

    const formatted = this.noteFormatter.format(currentHtml);
    this.mePreFormatContent = currentHtml; // keep undo buffer
    if (isTiptap) {
      this.editTiptap!.setContent(formatted);
    }
    this.editContent = formatted;
  }

  shareNote(): void {
    if (!this.activeNote) return;
    const text = `${this.activeNote.topic}\n\n${this.activeNote.content.slice(0, 300)}\u2026`;
    if ((navigator as any).share) {
      (navigator as any).share({ title: this.activeNote.topic, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text)
        .then(() => alert('Note copied to clipboard!'))
        .catch(() => {});
    }
  }

  onAskKeydown(e: KeyboardEvent): void {
    if (!e.shiftKey) { e.preventDefault(); this.askAiAboutNote(); }
  }

  toggleAiGroup(group: string): void {
    this.aiGroupOpen = this.aiGroupOpen === group ? null : group;
  }

  askAiAboutNote(): void {
    const q = this.aiAskQuery.trim();
    if (!q || !this.activeNote || this.aiActionLoading) return;
    this.aiStreamSub?.unsubscribe();
    this.aiActionLoading  = true;
    this.aiActionStreaming = true;
    this.aiActionResult   = '';
    this.aiActionError    = '';
    this.aiTagSuggestions = [];
    this.aiSavedToNote    = false;

    const prompt = `Answer the following question about this note. Be concise and helpful.\n\nNote title: ${this.activeNote.topic}\nNote content:\n${this.activeNote.content}\n\nQuestion: ${q}`;
    this.aiAskQuery = '';

    this.aiStreamSub = this.aiSvc.getOllamaExplanation(prompt).subscribe({
      next: res => {
        this.aiActionResult  = res.explanation;
        if (res.done) { this.aiActionLoading = false; this.aiActionStreaming = false; }
      },
      error: () => {
        this.aiActionLoading  = false;
        this.aiActionStreaming = false;
        this.aiActionError    = 'Connection error. Please try again.';
      },
      complete: () => { this.aiActionLoading = false; this.aiActionStreaming = false; },
    });
  }

  runAiAction(action:
    'summarize' | 'explain' | 'quiz' | 'flashcards' |
    'simplify'  | 'expand'  | 'example' | 'code' | 'interview'
  ): void {
    if (!this.activeNote || this.aiActionLoading) return;
    this.aiStreamSub?.unsubscribe();
    this.aiActionLoading  = true;
    this.aiActionStreaming = true;
    this.aiActionResult   = '';
    this.aiActionError    = '';
    this.aiTagSuggestions = [];
    this.aiSavedToNote    = false;

    const content = this.activeNote.content;
    const prompts: Record<string, string> = {
      summarize:  `Summarize the following note in 3-5 concise bullet points:\n\n${content}`,
      explain:    `Explain the key concepts in the following note in simple, beginner-friendly terms. Use analogies and concrete examples:\n\n${content}`,
      simplify:   `Re-write the following note using the simplest possible language (ELI5). Keep it accurate but very easy to understand:\n\n${content}`,
      expand:     `Expand the following note with more detail, real-world context, and deeper explanation:\n\n${content}`,
      example:    `Generate a clear, practical real-world example that illustrates the concept in this note:\n\n${content}`,
      code:       `Write a well-commented code example that demonstrates the concept from this note. Include multiple small examples if helpful:\n\n${content}`,
      interview:  `Convert this note into a strong interview answer. Use the STAR/PAR method where applicable, add key technical detail, and keep it concise:\n\n${content}`,
      quiz:       `Generate a short 3-question quiz based on this note. Use Q&A format with answers:\n\n${content}`,
      flashcards: `Convert the key concepts from this note into flashcard format. For each card write:\nQ: <question>\nA: <answer>\n\nGenerate 5-8 flashcards:\n\n${content}`,
    };

    this.aiStreamSub = this.aiSvc.getOllamaExplanation(prompts[action]).subscribe({
      next: res => {
        this.aiActionResult  = res.explanation;
        if (res.done) {
          this.aiActionLoading  = false;
          this.aiActionStreaming = false;
        }
      },
      error: () => {
        this.aiActionLoading  = false;
        this.aiActionStreaming = false;
        this.aiActionError    = 'Connection error. Please try again.';
      },
      complete: () => {
        this.aiActionLoading  = false;
        this.aiActionStreaming = false;
      },
    });
  }

  stopAiAction(): void {
    this.aiStreamSub?.unsubscribe();
    this.aiStreamSub      = null;
    this.aiActionLoading  = false;
    this.aiActionStreaming = false;
  }

  /** Append the current AI result as a new section of the active note */
  async saveAiResultToNote(): Promise<void> {
    if (!this.activeNote?.id || !this.aiActionResult.trim()) return;
    try {
      await this.notesService.mergeNote(this.activeNote.id, this.aiActionResult);
      this.aiSavedToNote = true;
      this.showToast('AI result appended to note.');
      setTimeout(() => { this.aiSavedToNote = false; }, 2500);
    } catch {
      this.showToast('Failed to append result to note.', 'error');
    }
  }

  /** Use AI to suggest tags for the active note */
  suggestTags(): void {
    if (!this.activeNote || this.aiActionLoading) return;
    this.aiStreamSub?.unsubscribe();
    this.aiActionLoading  = true;
    this.aiActionStreaming = true;
    this.aiActionResult   = '';
    this.aiTagSuggestions = [];
    this.aiActionError    = '';

    const prompt = `Based on the topic and content of the following note, suggest 5-8 relevant, specific programming/tech tags.
Return ONLY a JSON array of lowercase strings, no explanation.
Example output: ["javascript", "async", "promises", "es6"]

Note title: ${this.activeNote.topic}
Note content: ${this.activeNote.content.slice(0, 600)}`;

    let accumulated = '';
    this.aiStreamSub = this.aiSvc.getOllamaExplanation(prompt).subscribe({
      next: res => {
        accumulated = res.explanation;
        if (res.done) {
          this.aiActionLoading  = false;
          this.aiActionStreaming = false;
          // Try to parse JSON array from response
          try {
            const match = accumulated.match(/\[[\s\S]*?\]/);
            if (match) {
              const tags: string[] = JSON.parse(match[0]);
              this.aiTagSuggestions = tags.filter(t => typeof t === 'string').map(t => t.toLowerCase().replace(/\s+/g,'-'));
            }
          } catch {
            this.aiTagSuggestions = [];
            this.aiActionError = 'Could not parse tag suggestions.';
          }
        }
      },
      error: () => {
        this.aiActionLoading  = false;
        this.aiActionStreaming = false;
        this.aiActionError = 'Tag suggestion failed.';
      },
      complete: () => {
        this.aiActionLoading  = false;
        this.aiActionStreaming = false;
      },
    });
  }

  /** Apply a suggested tag to the active note */
  async applySuggestedTag(tag: string): Promise<void> {
    if (!this.activeNote?.id) return;
    if ((this.activeNote.tags ?? []).includes(tag)) return;
    const newTags = [...(this.activeNote.tags ?? []), tag];
    try {
      await this.notesService.updateNote(this.activeNote.id, {
        content:  this.activeNote.content,
        tags:     newTags,
      });
      this.aiTagSuggestions = this.aiTagSuggestions.filter(t => t !== tag);
    } catch { /* ignore */ }
  }

  /** Open the modal-confirmation dialog (reader header / mobile reader) */
  requestDelete(note: SavedNote): void {
    if (!note.id) return;
    this.deleteModal = note;
  }

  cancelDelete(): void {
    this.deleteModal = null;
    this.isDeleting  = false;
  }

  /** Called when the user clicks Confirm inside the modal */
  async confirmDelete(): Promise<void> {
    const note = this.deleteModal;
    if (!note?.id) return;
    this.isDeleting = true;
    try {
      await this.notesService.deleteNote(note.id);
      this.deleteModal = null;
      this.isDeleting  = false;
      if (this.activeNote?.id === note.id) { this.activeNote = null; this.editMode = false; }
      this._showUndoToast(note);
    } catch {
      this.isDeleting = false;
      this.showToast('Failed to delete note.', 'error');
    }
  }

  /**
   * Two-step inline delete for sidebar list items.
   * First click sets pendingDeleteId; second click deletes directly with undo toast.
   */
  requestListDelete(e: MouseEvent, note: SavedNote): void {
    e.stopPropagation();
    if (!note.id) return;
    if (this.pendingDeleteId !== note.id) {
      // First tap — request confirmation inline
      this.pendingDeleteId = note.id;
      // Auto-cancel after 3 seconds
      setTimeout(() => {
        if (this.pendingDeleteId === note.id) this.pendingDeleteId = null;
      }, 3000);
      return;
    }
    // Second tap — confirmed
    this.pendingDeleteId = null;
    this._doInlineDelete(note);
  }

  cancelListDelete(e: MouseEvent): void {
    e.stopPropagation();
    this.pendingDeleteId = null;
  }

  private async _doInlineDelete(note: SavedNote): Promise<void> {
    this.deletingId = note.id!;
    try {
      await this.notesService.deleteNote(note.id!);
      if (this.activeNote?.id === note.id) { this.activeNote = null; this.editMode = false; }
      this._showUndoToast(note);
    } catch {
      this.showToast('Failed to delete note.', 'error');
    } finally {
      this.deletingId = null;
    }
  }

  private _showUndoToast(note: SavedNote): void {
    // Cancel any previous undo window
    if (this.undoPending) {
      clearTimeout(this.undoPending.timer);
      this.undoPending = null;
    }
    const timer = setTimeout(() => { this.undoPending = null; }, 6000);
    this.undoPending = { note, timer };
    // Override the normal toast with the undo toast (custom rendering in HTML)
    clearTimeout(this.toastTimer);
    this.toast = null; // undo toast is rendered separately
  }

  async undoDelete(): Promise<void> {
    if (!this.undoPending) return;
    const { note, timer } = this.undoPending;
    clearTimeout(timer);
    this.undoPending = null;
    try {
      await this.notesService.saveNote(
        note.topic,
        note.category || 'Other',
        note.content,
        note.tags ?? []
      );
      this.showToast(`"${note.topic}" restored.`);
    } catch {
      this.showToast('Could not restore note.', 'error');
    }
  }

  dismissUndoToast(): void {
    if (this.undoPending) {
      clearTimeout(this.undoPending.timer);
      this.undoPending = null;
    }
  }

  async deleteNote(note: SavedNote): Promise<void> {
    if (!note.id) return;
    if (!confirm(`Delete note "${note.topic}"?`)) return;
    this.deletingId = note.id;
    try {
      await this.notesService.deleteNote(note.id);
      if (this.activeNote?.id === note.id) { this.activeNote = null; this.editMode = false; }
      this.showToast('Note deleted.');
    } catch {
      this.showToast('Failed to delete note.', 'error');
    } finally {
      this.deletingId = null;
    }
  }

  // ── Edit mode ─────────────────────────────────────────────────────────────

  startEdit(): void {
    if (!this.activeNote) return;
    this.editTopic    = this.activeNote.topic;
    this.editCategory = this.activeNote.category || 'Other';
    this.editTags     = [...(this.activeNote.tags ?? [])];
    this.editContent  = this.activeNote.content;
    this.appendText   = '';
    this.updateError  = '';
    this.editMode     = true;
  }

  cancelEdit(): void {
    this.editMode    = false;
    this.updateError = '';
  }

  addEditTag(): void {
    const t = this.editTagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !this.editTags.includes(t)) this.editTags.push(t);
    this.editTagInput = '';
  }

  addEditTagOnKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); this.addEditTag(); }
  }

  removeEditTag(tag: string): void {
    this.editTags = this.editTags.filter(t => t !== tag);
  }

  async saveEdit(): Promise<void> {
    if (!this.activeNote?.id || !this.editTopic.trim()) return;
    this.isUpdating  = true;
    this.updateError = '';

    // Mobile editor (textarea) → always use editContent (plain markdown — NEVER Tiptap HTML).
    // Desktop editor (Tiptap)  → use Tiptap's HTML output.
    // This prevents raw HTML tags appearing in the mobile textarea after a round-trip.
    const editorContent = (this.mobileEditorOpen ? this.editContent : (this.editTiptap ? this.editTiptap.getHTML() : this.editContent)) ?? this.editContent;
    const finalContent  = this.appendText.trim()
      ? `${editorContent}\n\n---\n\n**Added note:**\n\n${this.appendText.trim()}`
      : editorContent;
    try {
      await this.notesService.updateNote(this.activeNote.id, {
        topic:    this.editTopic.trim(),
        category: this.editCategory,
        tags:     this.editTags,
        content:  finalContent
      });
      this.editMode = false;
      if (this.mobileEditorOpen) this.closeMobileEditor(true); // go back to reader
      this.showToast('Note saved successfully.');
    } catch (e: any) {
      const status: number | undefined = e?.status;
      const serverMsg: string | undefined = e?.error?.message || e?.error?.error;
      if (status === 0) {
        this.updateError = 'Cannot reach the server. Check your internet connection.';
      } else if (status === 401) {
        this.updateError = 'Session expired. Please log in again.';
      } else if (status === 402) {
        this.updateError = serverMsg || 'Your free trial has ended. Please subscribe to continue.';
      } else {
        this.updateError = serverMsg || `Failed to save changes${status ? ` (HTTP ${status})` : ''}.`;
      }
    } finally {
      this.isUpdating = false;
    }
  }

  // ── Export ────────────────────────────────────────────────────────────────

  exportAsTxt(): void {
    if (!this.activeNote) return;
    this.downloadFile(
      this.buildExportText('txt'),
      `${this.slugify(this.activeNote.topic)}.txt`,
      'text/plain'
    );
  }

  exportAsMd(): void {
    if (!this.activeNote) return;
    this.downloadFile(
      this.buildExportText('md'),
      `${this.slugify(this.activeNote.topic)}.md`,
      'text/markdown'
    );
  }

  exportAsPdf(): void {
    if (!this.activeNote) return;
    const win = window.open('', '_blank')!;
    win.document.write(`
      <html><head><title>${this.activeNote.topic}</title>
      <style>
        body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; line-height: 1.7; color: #222; }
        h1   { font-size: 1.5rem; border-bottom: 2px solid #7c6af7; padding-bottom: 8px; }
        pre  { background: #f4f4f4; padding: 12px; border-radius: 6px; white-space: pre-wrap; }
        .meta { color: #666; font-size: 0.85rem; margin-bottom: 24px; }
      </style></head><body>
      <h1>${this.activeNote.topic}</h1>
      <div class="meta">Category: ${this.activeNote.category} &nbsp;|&nbsp; Saved: ${this.formatDate(this.activeNote.savedAtMs)}
      ${(this.activeNote.tags ?? []).length ? `&nbsp;|&nbsp; Tags: ${this.activeNote.tags!.join(', ')}` : ''}
      </div>
      <pre>${this.escapeHtml(this.activeNote.content)}</pre>
    </body></html>`);
    win.document.close();
    win.print();
  }

  private buildExportText(fmt: 'txt' | 'md'): string {
    const n = this.activeNote!;
    const tags = (n.tags ?? []).length ? `Tags: ${n.tags!.join(', ')}\n` : '';
    if (fmt === 'md') {
      return `# ${n.topic}\n\n**Category:** ${n.category}\n${tags}**Saved:** ${this.formatDate(n.savedAtMs)}\n\n---\n\n${n.content}`;
    }
    return `${n.topic}\n${'─'.repeat(n.topic.length)}\nCategory: ${n.category}\n${tags}Saved: ${this.formatDate(n.savedAtMs)}\n\n${n.content}`;
  }

  private downloadFile(content: string, filename: string, type: string): void {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  private slugify(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
  }

  private escapeHtml(s: string): string {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── Misc ──────────────────────────────────────────────────────────────────

  goHome(): void { this.router.navigate(['/']); }

  /** Show floating AI menu when user selects text inside the reader */
  @HostListener('document:mouseup', ['$event'])
  onMouseUp(e: MouseEvent): void {
    if (!this.activeNote || this.editMode || this.createMode) {
      this.showSelectionMenu = false;
      return;
    }
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? '';
    if (text.length > 10) {
      const range = sel!.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      this.selectionMenuText = text;
      this.selectionMenuPos  = {
        x: rect.left + rect.width / 2,
        y: rect.top + window.scrollY - 52
      };
      this.showSelectionMenu = true;
    } else {
      this.showSelectionMenu = false;
    }
  }

  runSelectionAction(action: 'explain' | 'simplify' | 'example'): void {
    if (!this.selectionMenuText || this.aiActionLoading) return;
    this.showSelectionMenu   = false;
    this.aiStreamSub?.unsubscribe();
    this.aiActionLoading     = true;
    this.aiActionStreaming   = true;
    this.aiActionResult      = '';
    this.aiActionError       = '';
    const text = this.selectionMenuText;
    const promptMap: Record<string, string> = {
      explain:  `Explain the following selected text in simple, beginner-friendly terms:\n\n"${text}"`,
      simplify: `Rewrite the following text in the simplest possible language (ELI5):\n\n"${text}"`,
      example:  `Give a concrete real-world example for the following concept:\n\n"${text}"`,
    };
    this.aiStreamSub = this.aiSvc.getOllamaExplanation(promptMap[action]).subscribe({
      next: res => {
        this.aiActionResult = res.explanation;
        if (res.done) { this.aiActionLoading = false; this.aiActionStreaming = false; }
      },
      error: () => {
        this.aiActionLoading   = false;
        this.aiActionStreaming  = false;
        this.aiActionError     = 'Connection error. Please try again.';
      },
      complete: () => { this.aiActionLoading = false; this.aiActionStreaming = false; }
    });
  }

  copySelectionToClipboard(): void {
    if (!this.selectionMenuText) return;
    navigator.clipboard.writeText(this.selectionMenuText).catch(() => {});
    this.showSelectionMenu = false;
  }

  getCategoryIcon(category: string | undefined): string {
    const icons: Record<string, string> = {
      'Frontend':      '🌐',
      'Backend':       '⚙️',
      'DevOps':        '🚀',
      'Database':      '🗄️',
      'Security':      '🔒',
      'AI/ML':         '🤖',
      'System Design': '🏗️',
      'Algorithms':    '🧮',
      'Career':        '💼',
      'Interview':     '🎯',
      'General':       '📝',
    };
    return icons[category ?? ''] ?? '📌';
  }

  /** Keyboard shortcut: E = start edit, Escape = cancel edit, Ctrl/Cmd+Shift+F = Format with AI */
  @HostListener('document:keydown', ['$event'])
  handleKey(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement).tagName.toLowerCase();
    const inInput = tag === 'input' || tag === 'textarea' || tag === 'select';
    if (!inInput && e.key === 'e' && this.activeNote && !this.editMode && !this.createMode) {
      this.startEdit();
    }
    if (e.key === 'Escape' && this.editMode) {
      this.cancelEdit();
    }
    // Ctrl+Shift+F / Cmd+Shift+F — Format with AI in whichever mode is active
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      const cnHasContent = this.cnTiptap ? !this.cnTiptap.isEmpty() : !!this.createContent.trim();
      if (this.createMode && cnHasContent && !this.isFormatting) {
        this.formatNoteWithAI();
      } else if (this.editMode && this.editContent.trim() && !this.meFormatLoading) {
        this.formatMobileWithAI();
      }
    }
  }

  formatDate(ms: number | undefined): string {
    if (!ms) return '';
    return new Date(ms).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  /** Returns "Today", "Yesterday", "This Week", "This Month", or "Older" */
  noteDateGroupLabel(ms: number | undefined): string {
    if (!ms) return 'Older';
    const diffDays = Math.floor((Date.now() - ms) / 86_400_000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return 'This Week';
    if (diffDays <= 30) return 'This Month';
    return 'Older';
  }

  /** True if this note is the first item in its date group within filteredNotes */
  isFirstInDateGroup(note: any, index: number): boolean {
    if (index === 0) return true;
    const prev = this.filteredNotes[index - 1];
    return this.noteDateGroupLabel(note.savedAtMs) !== this.noteDateGroupLabel(prev.savedAtMs);
  }

  // ── Create Note mode ───────────────────────────────────────────────────────

  openCreateNote(): void {
    this.setCreatePageLock(true);
    this.createMode        = true;
    this.createTopic       = '';
    this.createCategory    = 'Frontend';
    this.createTags        = [];
    this.createTagInput    = '';
    this.createContent     = '';
    this.preAIContent      = null;
    this.isFormatting      = false;
    this.isSavingNew       = false;
    this.createSaveSuccess = false;
    this.createPreviewMode = false;
    this.createError       = '';
    this.editMode          = false;
  }

  closeCreateNote(): void {
    if (this.isFormatting) { this.formatXhr?.abort(); this.formatXhr = null; }
    this.setCreatePageLock(false);
    this.createMode = false;
    this.createError = '';
  }

  private setCreatePageLock(active: boolean): void {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('notes-create-active', active);
  }

  focusCreateTitle(): void {
    const input = this.createTitleInput?.nativeElement;
    if (!input) return;
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => input.focus(), 120);
  }

  addCreateTag(): void {
    const t = this.createTagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !this.createTags.includes(t)) this.createTags.push(t);
    this.createTagInput = '';
  }

  addCreateTagOnKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); this.addCreateTag(); }
  }

  removeCreateTag(tag: string): void {
    this.createTags = this.createTags.filter(t => t !== tag);
  }

  undoAIFormat(): void {
    if (this.preAIContent !== null) {
      this.cnTiptap?.setContent(this.preAIContent);
      this.createContent     = this.preAIContent;
      this.preAIContent      = null;
      this.createPreviewMode = false;
    }
  }

  /**
   * Format the create-note editor content instantly using the local
   * NoteFormatterService — no network call, no latency, works offline.
   * Keeps an undo buffer (preAIContent) so the user can revert.
   */
  formatNoteWithAI(): void {
    const currentHtml = this.cnTiptap ? this.cnTiptap.getHTML() : this.createContent;
    const isEmpty     = this.cnTiptap ? this.cnTiptap.isEmpty() : !this.createContent.trim();

    if (isEmpty) {
      this.createError = 'Please enter some text to format first.';
      return;
    }

    this.preAIContent = currentHtml;
    this.createError  = '';

    const formatted = this.noteFormatter.format(currentHtml);
    this.cnTiptap?.setContent(formatted);
    this.createContent = formatted;
  }

  async saveNewNote(): Promise<void> {
    if (!this.user) {
      this.createError = 'Please log in to save notes.';
      return;
    }
    if (!this.createTopic.trim()) {
      this.createError = 'Please enter a title for the note.';
      return;
    }
    // Prefer Tiptap HTML; fall back to the textarea-bound string
    const content = (this.cnTiptap ? this.cnTiptap.getHTML() : this.createContent) ?? '';
    if (!content.trim() || content === '<p></p>') {
      this.createError = 'Note content cannot be empty.';
      return;
    }
    this.isSavingNew       = true;
    this.createError       = '';
    this.createSaveSuccess = false;
    try {
      await this.notesService.saveNote(
        this.createTopic.trim(),
        this.createCategory,
        content,
        this.createTags
      );
      this.createSaveSuccess = true;
      this.draft.clearDraft();  // clear any pending share draft
      this.showToast(`Note "${this.createTopic.trim()}" saved successfully.`);
      setTimeout(() => {
        this.setCreatePageLock(false);
        this.createMode = false;
        this.createSaveSuccess = false;
      }, 1500);
    } catch (e: any) {
      const status: number | undefined = e?.status;
      const serverMsg: string | undefined = e?.error?.message || e?.error?.error;
      if (status === 0) {
        this.createError = 'Cannot reach the server. Check your internet connection.';
      } else if (status === 401) {
        this.createError = 'Session expired. Please log in again.';
      } else if (status === 402) {
        this.createError = serverMsg || 'Your free trial has ended. Please subscribe to continue saving notes.';
      } else if (serverMsg) {
        this.createError = serverMsg;
      } else {
        this.createError = `Failed to save note${status ? ` (HTTP ${status})` : ''}. Please try again.`;
      }
    } finally {
      this.isSavingNew = false;
    }
  }
}

