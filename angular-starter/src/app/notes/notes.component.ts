import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CustomAuthService, AuthUser } from '../shared/custom-auth.service';
import { NotesService, SavedNote } from '../shared/notes.service';
import { NOTE_CATEGORIES } from '../shared/save-notes-modal/save-notes-modal.component';
import { AI_BACKEND } from '../config/ai.config';
import { AILearnService } from '../services/ai-learn.service';

@Component({
  selector: 'app-notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.css']
})
export class NotesComponent implements OnInit, OnDestroy {
  user: AuthUser | null = null;
  notes: SavedNote[] = [];
  activeNote: SavedNote | null = null;
  isLoading   = false;
  deletingId: string | null = null;

  // ── Filters ──────────────────────────────────────────────────────────────
  filterCategory = 'All';
  filterTag      = '';

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
  mobileReaderOpen = false;
  showMoreMenu     = false;
  showAiActions    = false;
  aiActionLoading  = false;
  aiActionResult   = '';
  aiActionError    = '';
  private aiXhr: XMLHttpRequest | null = null;

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

  readonly categories = NOTE_CATEGORIES;

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

  private readonly subs: Subscription[] = [];

  constructor(
    private authSvc:      CustomAuthService,
    private notesService: NotesService,
    private router:       Router,
    private aiSvc:        AILearnService,
  ) {}

  ngOnInit(): void {
    this.user = this.authSvc.currentUser;
    if (this.user) { this.startLoadingNotes(); }

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
        } else if (!user) {
          this.isLoading = false;
          this.notes     = [];
          this.activeNote = null;
          this.editMode  = false;
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
        if (this.activeNote) {
          const refreshed = notes.find(n => n.id === this.activeNote!.id);
          this.activeNote = refreshed ?? null;
          if (this.editMode && !this.activeNote) this.editMode = false;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.aiStreamSub?.unsubscribe();
    this.formatXhr?.abort();
    this.aiXhr?.abort();
    this.meXhr?.abort();
    clearTimeout(this.toastTimer);
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
      return matchesCat && matchesTag && matchesSearch;
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
    this.editMode         = false;
    this.updateError      = '';
    this.mobileReaderOpen = true;
    this.showMoreMenu     = false;
    this.showAiActions    = false;
    this.aiActionResult   = '';
    this.aiActionError    = '';
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
    this.activeNote       = null;
    this.editMode         = false;
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
      this.editContent        = this.mePreFormatContent;
      this.mePreFormatContent = null;
    }
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

  formatMobileWithAI(): void {
    if (!this.editContent.trim() || this.meFormatLoading) return;
    this.mePreFormatContent = this.editContent;
    this.meFormatLoading    = true;
    this.updateError        = '';
    this.editContent        = '';

    const prompt =
      `You are a note formatter. Your ONLY job is to return clean, well-structured markdown. No matter what the input is, always produce formatted output.\n\n` +
      `STRICT RULES:\n` +
      `- ALWAYS return formatted markdown. Never refuse, never explain, never say text is meaningless.\n` +
      `- If input is very short, random, or unclear, wrap it as-is under a ## Notes heading.\n` +
      `- Use ## or ### for headings, bullet points for lists, code blocks for code.\n` +
      `- Keep paragraphs short and readable.\n` +
      `- Add [ ] checklists where action items appear.\n` +
      `- Return ONLY the formatted markdown — zero commentary, zero preamble.\n` +
      `- Do NOT write things like: "This text is meaningless", "Please provide", "I cannot", etc.\n\n` +
      `Raw text:\n\n${this.mePreFormatContent}`;

    const apiBase = window.location.hostname === 'localhost' ? '' : 'https://learnwithai.tech';
    const xhr     = new XMLHttpRequest();
    this.meXhr    = xhr;
    xhr.open('POST', `${apiBase}/api/ai/stream`, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-API-Key', AI_BACKEND.API_KEY);
    xhr.responseType = 'text';

    let cursor = 0; let acc = '';
    const parse = () => {
      const newText = xhr.responseText.slice(cursor);
      cursor = xhr.responseText.length;
      for (const line of newText.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        try {
          const chunk = JSON.parse(line.slice(6));
          if (chunk.done) {
            this.meFormatLoading = false; this.meXhr = null;
            if (chunk.error) {
              this.updateError = `AI error: ${chunk.error}`;
              this.editContent = this.mePreFormatContent!;
              this.mePreFormatContent = null;
            } else {
              this.editContent = acc || this.mePreFormatContent!;
            }
            return;
          }
          acc += chunk.token || ''; this.editContent = acc;
        } catch { /* skip */ }
      }
    };
    xhr.onprogress = () => parse();
    xhr.onload     = () => { parse(); this.meFormatLoading = false; this.meXhr = null; };
    xhr.onerror    = () => {
      this.meFormatLoading = false; this.meXhr = null;
      this.updateError = 'Connection error. Try again.';
      this.editContent = this.mePreFormatContent!; this.mePreFormatContent = null;
    };
    xhr.send(JSON.stringify({ question: prompt, provider: 'ollama', rawMode: true, maxTokens: 2048 }));
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
    const finalContent = this.appendText.trim()
      ? `${this.editContent}\n\n---\n\n**Added note:**\n\n${this.appendText.trim()}`
      : this.editContent;
    try {
      await this.notesService.updateNote(this.activeNote.id, {
        topic:    this.editTopic.trim(),
        category: this.editCategory,
        tags:     this.editTags,
        content:  finalContent
      });
      this.editMode = false;
      this.showToast('Note saved successfully.');
    } catch (e: any) {
      this.updateError = e?.error?.message || 'Failed to save changes.';
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

  /** Keyboard shortcut: E = start edit, Escape = cancel edit */
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
  }

  formatDate(ms: number | undefined): string {
    if (!ms) return '';
    return new Date(ms).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  // ── Create Note mode ───────────────────────────────────────────────────────

  openCreateNote(): void {
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
    this.createMode = false;
    this.createError = '';
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
      this.createContent     = this.preAIContent;
      this.preAIContent      = null;
      this.createPreviewMode = false;
    }
  }

  formatNoteWithAI(): void {
    if (!this.createContent.trim()) {
      this.createError = 'Please enter some text to format first.';
      return;
    }
    this.preAIContent  = this.createContent;
    this.isFormatting  = true;
    this.createError   = '';
    this.createContent = '';

    const formattingPrompt =
      `You are a note formatter. Your ONLY job is to return clean, well-structured markdown. No matter what the input is, always produce formatted output.\n\n` +
      `STRICT RULES — follow every one of them:\n` +
      `- ALWAYS return formatted markdown. Never refuse, never explain, never say text is meaningless.\n` +
      `- If input is very short, random, or unclear, wrap it as-is under a ## Notes heading — still return markdown.\n` +
      `- Use ## or ### for clear headings when content warrants it.\n` +
      `- Use bullet points (- or *) for list-like content.\n` +
      `- Use code blocks (\`\`\`) for any code or technical snippets.\n` +
      `- Keep paragraphs short and readable.\n` +
      `- Add [ ] checklists where action items appear.\n` +
      `- Return ONLY the formatted markdown — zero commentary, zero preamble, zero apologies.\n` +
      `- Do not change the meaning of the content.\n` +
      `- Do NOT write things like: "This text is meaningless", "Please provide", "I cannot", etc.\n\n` +
      `Example for unclear input "gbgfhfhgfhgf":\n## Notes\ngbgfhfhgfhgf\n\n` +
      `Raw text to format:\n\n${this.preAIContent}`;

    const apiBase = window.location.hostname === 'localhost' ? '' : 'https://learnwithai.tech';
    const xhr     = new XMLHttpRequest();
    this.formatXhr = xhr;

    xhr.open('POST', `${apiBase}/api/ai/stream`, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-API-Key', AI_BACKEND.API_KEY);
    xhr.responseType = 'text';

    let cursor      = 0;
    let accumulated = '';

    const parseChunks = () => {
      const newText = xhr.responseText.slice(cursor);
      cursor = xhr.responseText.length;
      for (const line of newText.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        try {
          const chunk = JSON.parse(line.slice(6));
          if (chunk.done) {
            this.isFormatting = false;
            this.formatXhr    = null;
            if (chunk.error) {
              this.createError   = `AI formatting failed: ${chunk.error}`;
              this.createContent = this.preAIContent!;
              this.preAIContent  = null;
            } else {
              this.createContent     = accumulated || this.preAIContent!;
              this.createPreviewMode = true;   // auto-switch to preview
            }
            return;
          }
          accumulated        += chunk.token || '';
          this.createContent  = accumulated;
        } catch { /* malformed chunk */ }
      }
    };

    xhr.onprogress = () => parseChunks();
    xhr.onload     = () => { parseChunks(); this.isFormatting = false; this.formatXhr = null; };
    xhr.onerror    = () => {
      this.isFormatting  = false;
      this.formatXhr     = null;
      this.createError   = 'Connection error. Please try formatting again.';
      this.createContent = this.preAIContent!;
      this.preAIContent  = null;
    };

    xhr.send(JSON.stringify({
      question:  formattingPrompt,
      provider:  'ollama',
      rawMode:   true,
      maxTokens: 2048
    }));
  }

  async saveNewNote(): Promise<void> {
    if (!this.createTopic.trim()) {
      this.createError = 'Please enter a title for the note.';
      return;
    }
    if (!this.createContent.trim()) {
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
        this.createContent.trim(),
        this.createTags
      );
      this.createSaveSuccess = true;
      this.showToast(`Note "${this.createTopic.trim()}" saved successfully.`);
      setTimeout(() => { this.createMode = false; this.createSaveSuccess = false; }, 1500);
    } catch (e: any) {
      this.createError = e?.error?.message || 'Failed to save note. Please try again.';
    } finally {
      this.isSavingNew = false;
    }
  }
}

