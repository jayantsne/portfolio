import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  AdminInterviewPrepService,
  AdminPrepAiHelperResponse,
  AdminPrepImportQuestion,
  AdminPrepQuestion,
  AdminPrepResponse
} from './admin-interview-prep.service';
import { NotesService, SavedNote } from '../../shared/notes.service';
import { SQL_QUESTION_PACK } from '../admin-interview-prep-import/sql-question-pack';

type ImportMode = 'lines' | 'json';

@Component({
  selector: 'app-admin-interview-prep',
  templateUrl: './admin-interview-prep.component.html',
  styleUrls: ['./admin-interview-prep.component.css']
})
export class AdminInterviewPrepComponent implements OnInit {
  questions: AdminPrepQuestion[] = [];
  dailyPlan: AdminPrepQuestion[] = [];
  categories: string[] = ['All', '.NET Core', '.NET', 'SQL', 'Angular', 'React', 'Azure', 'Design Patterns', 'OOPS', 'SOLID', 'AI'];

  selectedCategory = 'All';
  search = '';
  includeCovered = true;
  dailyTarget = 5;
  viewMode: 'focus' | 'library' = 'focus';
  focusIndex = 0;
  focusTab: 'understand' | 'answer' | 'example' | 'notes' = 'understand';
  draftAnswer = '';

  total = 0;
  covered = 0;
  loading = false;
  savingId = '';
  message = '';
  error = '';

  importMode: ImportMode = 'lines';
  replaceExisting = false;
  importText = '';
  importPreview: AdminPrepImportQuestion[] = [];
  importError = '';

  selectedQuestion: AdminPrepQuestion | null = null;
  aiHelper: AdminPrepAiHelperResponse | null = null;
  aiLoading = false;
  notes: SavedNote[] = [];
  noteMatches: Record<string, SavedNote> = {};
  preparedTodayIds = new Set<string>();
  private sqlSeedAttempted = false;

  accessQuestion: AdminPrepQuestion | null = null;
  accessText = '';

  readonly sampleLines = [
    '.NET | What is middleware in ASP.NET Core? | middleware, pipeline',
    '.NET | What is the difference between IActionResult and ActionResult<T>? | web-api',
    'Design Patterns | What is Repository Pattern? | architecture, ef-core',
    'SQL | How do ROW_NUMBER, RANK, and DENSE_RANK differ? | window-functions, ranking',
    'Azure | How do you secure Azure App Service configuration? | cloud, security',
    'AI | What is RAG and when do you use it? | gen-ai'
  ].join('\n');

  readonly sampleJson = JSON.stringify([
    {
      category: '.NET',
      question: 'How do you handle API versioning?',
      difficulty: 'Medium',
      tags: ['web-api', 'versioning'],
      noteUrl: '/notes?search=api%20versioning'
    }
  ], null, 2);

  constructor(
    private prepService: AdminInterviewPrepService,
    private notesService: NotesService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.loadPreparedToday();
    await this.notesService.loadNotes();
    this.notes = this.notesService.notes;
    await this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';

    try {
      let response: AdminPrepResponse = await this.prepService.getAll(
        this.selectedCategory,
        this.search,
        this.includeCovered
      );

      // Existing installations predate the SQL pack. Seed it once when the
      // owner's library has no SQL category; subsequent loads remain read-only.
      if (!this.sqlSeedAttempted && !response.categories.some(category => category.toLowerCase() === 'sql')) {
        this.sqlSeedAttempted = true;
        await this.prepService.importQuestions(SQL_QUESTION_PACK, false);
        response = await this.prepService.getAll(
          this.selectedCategory,
          this.search,
          this.includeCovered
        );
      }
      this.questions = response.questions;
      this.total = response.total;
      this.covered = response.covered;
      this.dailyTarget = response.dailyTarget || this.dailyTarget;
      this.categories = ['All', ...new Set([...this.categories.filter(c => c !== 'All'), ...response.categories])];
      this.buildNoteMatches();
      await this.loadDailyPlan();
    } catch (err) {
      console.error(err);
      this.error = 'Unable to load admin interview prep data.';
    } finally {
      this.loading = false;
    }
  }

  async loadDailyPlan(): Promise<void> {
    this.dailyPlan = await this.prepService.getDailyPlan(this.dailyTarget, this.selectedCategory);
    if (this.dailyPlan.length === 0) {
      this.focusIndex = 0;
      return;
    }

    if (this.focusIndex >= this.dailyPlan.length) {
      this.focusIndex = this.dailyPlan.length - 1;
    }

    const firstPending = this.dailyPlan.findIndex(question => !question.isCovered);
    if (this.focusIndex === 0 && firstPending > 0) {
      this.focusIndex = firstPending;
    }
  }

  private buildNoteMatches(): void {
    const matches: Record<string, SavedNote> = {};
    for (const question of this.questions) {
      const match = this.findMatchingNote(question);
      if (match) matches[question.id] = match;
    }
    this.noteMatches = matches;
  }

  private findMatchingNote(question: AdminPrepQuestion): SavedNote | null {
    const qTokens = this.tokenize(question.question);
    if (qTokens.length === 0) return null;

    let best: { note: SavedNote; score: number } | null = null;
    for (const note of this.notes) {
      const noteText = `${note.topic} ${note.category} ${(note.tags || []).join(' ')}`;
      const nTokens = new Set(this.tokenize(noteText));
      const hits = qTokens.filter(t => nTokens.has(t)).length;
      const score = hits / Math.max(qTokens.length, 1);

      const exactTopic = note.topic?.trim().toLowerCase() === question.question.trim().toLowerCase();
      const categoryBoost = note.category?.toLowerCase() === question.category.toLowerCase() ? 0.1 : 0;
      const finalScore = exactTopic ? 1 : score + categoryBoost;

      if ((exactTopic || (hits >= 2 && finalScore >= 0.6)) && (!best || finalScore > best.score)) {
        best = { note, score: finalScore };
      }
    }

    return best?.note || null;
  }

  private tokenize(value: string): string[] {
    const stopWords = new Set([
      'what', 'how', 'why', 'the', 'and', 'with', 'you', 'your', 'does', 'are', 'is', 'in', 'of', 'to', 'a', 'an',
      'explain', 'difference', 'between', 'core', 'framework', 'application', 'applications'
    ]);
    return value
      .toLowerCase()
      .replace(/[^a-z0-9+#\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2 && !stopWords.has(t));
  }

  async applyFilters(): Promise<void> {
    await this.load();
  }

  async toggleCovered(question: AdminPrepQuestion): Promise<void> {
    this.savingId = question.id;
    this.message = '';
    this.error = '';

    try {
      const updated = await this.prepService.setCovered(question.id, !question.isCovered);
      this.questions = this.questions.map(q => q.id === updated.id ? updated : q);
      this.dailyPlan = this.dailyPlan.map(q => q.id === updated.id ? updated : q);
      const previousCovered = question.isCovered;
      if (updated.isCovered !== previousCovered) {
        this.covered += updated.isCovered ? 1 : -1;
      }
      question.isCovered = updated.isCovered;
      if (updated.isCovered) {
        this.preparedTodayIds.add(updated.id);
      } else {
        this.preparedTodayIds.delete(updated.id);
      }
      this.savePreparedToday();
      this.message = updated.isCovered ? 'Marked as prepared.' : 'Moved back to pending.';
    } catch (err) {
      console.error(err);
      this.error = 'Could not update covered status.';
    } finally {
      this.savingId = '';
    }
  }

  async planToday(question: AdminPrepQuestion): Promise<void> {
    this.savingId = question.id;
    try {
      const updated = await this.prepService.setPlanDate(question.id);
      this.questions = this.questions.map(q => q.id === updated.id ? updated : q);
      await this.loadDailyPlan();
      this.message = 'Added to today plan.';
    } catch (err) {
      console.error(err);
      this.error = 'Could not add question to today plan.';
    } finally {
      this.savingId = '';
    }
  }

  async markPrepared(question: AdminPrepQuestion): Promise<void> {
    if (question.isCovered) return;
    await this.toggleCovered(question);
  }

  async markPending(question: AdminPrepQuestion): Promise<void> {
    if (!question.isCovered) return;
    await this.toggleCovered(question);
  }

  parseImport(): void {
    this.importError = '';
    this.importPreview = [];

    try {
      if (this.importMode === 'json') {
        const parsed = JSON.parse(this.importText || '[]');
        if (!Array.isArray(parsed)) {
          this.importError = 'JSON must be an array of question objects.';
          return;
        }
        this.importPreview = parsed
          .filter(x => x?.question)
          .map(x => ({
            question: String(x.question).trim(),
            category: String(x.category || 'General').trim(),
            difficulty: String(x.difficulty || 'Medium').trim(),
            tags: Array.isArray(x.tags) ? x.tags.map(String) : [],
            answerHint: x.answerHint ? String(x.answerHint) : '',
            noteUrl: x.noteUrl ? String(x.noteUrl) : '',
            allowedUserIds: Array.isArray(x.allowedUserIds) ? x.allowedUserIds.map(String) : []
          }));
        return;
      }

      this.importPreview = this.importText
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
          const parts = line.split('|').map(x => x.trim());
          const category = parts.length > 1 ? parts[0] : 'General';
          const question = parts.length > 1 ? parts[1] : parts[0];
          const tags = (parts[2] || '')
            .split(',')
            .map(x => x.trim())
            .filter(Boolean);

          return {
            category,
            question,
            difficulty: 'Medium',
            tags
          };
        })
        .filter(x => x.question.length > 0);
    } catch (err: any) {
      this.importError = err?.message || 'Could not parse import text.';
    }
  }

  async importQuestions(): Promise<void> {
    this.parseImport();
    if (this.importPreview.length === 0) {
      this.importError = 'No valid questions found.';
      return;
    }

    this.loading = true;
    this.message = '';
    this.error = '';

    try {
      const result = await this.prepService.importQuestions(this.importPreview, this.replaceExisting);
      this.importText = '';
      this.importPreview = [];
      this.message = `${result.imported} questions imported.`;
      await this.load();
    } catch (err) {
      console.error(err);
      this.error = 'Import failed.';
    } finally {
      this.loading = false;
    }
  }

  useSample(): void {
    this.importText = this.importMode === 'json' ? this.sampleJson : this.sampleLines;
    this.parseImport();
  }

  async openAiHelper(question: AdminPrepQuestion): Promise<void> {
    this.selectedQuestion = question;
    this.aiHelper = null;
    this.aiLoading = true;

    try {
      this.aiHelper = await this.prepService.getAiHelper(question.question, question.category);
    } catch (err) {
      console.error(err);
      this.error = 'Could not generate AI helper prompts.';
    } finally {
      this.aiLoading = false;
    }
  }

  async copy(text: string): Promise<void> {
    await navigator.clipboard.writeText(text);
    this.message = 'Copied.';
  }

  goToNotes(question: AdminPrepQuestion): void {
    const match = this.noteMatches[question.id];
    if (match?.id) {
      this.router.navigate(['/notes'], {
        queryParams: {
          search: match.topic,
          noteId: match.id
        }
      });
      return;
    }

    this.router.navigate(['/notes'], {
      queryParams: {
        contextType: 'admin-interview-prep',
        contextId: question.id,
        search: question.question
      }
    });
  }

  goToAllNotes(): void {
    this.router.navigate(['/notes']);
  }

  hasNote(question: AdminPrepQuestion): boolean {
    return !!this.noteMatches[question.id];
  }

  noteLabel(question: AdminPrepQuestion): string {
    return this.hasNote(question) ? 'Open Note' : 'Find Notes';
  }

  openAccess(question: AdminPrepQuestion): void {
    this.accessQuestion = question;
    this.accessText = (question.allowedUserIds || []).join(', ');
  }

  async saveAccess(): Promise<void> {
    if (!this.accessQuestion) return;
    const userIds = this.accessText
      .split(',')
      .map(x => x.trim())
      .filter(Boolean);

    this.savingId = this.accessQuestion.id;
    try {
      const updated = await this.prepService.setAccess(this.accessQuestion.id, userIds);
      this.questions = this.questions.map(q => q.id === updated.id ? updated : q);
      this.accessQuestion = null;
      this.message = 'Access list updated.';
    } catch (err) {
      console.error(err);
      this.error = 'Could not update access list.';
    } finally {
      this.savingId = '';
    }
  }

  async deleteQuestion(question: AdminPrepQuestion): Promise<void> {
    if (!confirm(`Delete this question?\n\n${question.question}`)) return;
    this.savingId = question.id;

    try {
      await this.prepService.deleteQuestion(question.id);
      this.questions = this.questions.filter(q => q.id !== question.id);
      this.dailyPlan = this.dailyPlan.filter(q => q.id !== question.id);
      this.total -= 1;
      this.message = 'Question deleted.';
    } catch (err) {
      console.error(err);
      this.error = 'Could not delete question.';
    } finally {
      this.savingId = '';
    }
  }

  get progressPercent(): number {
    return this.total === 0 ? 0 : Math.round((this.covered / this.total) * 100);
  }

  get dailyDone(): number {
    return this.dailyPlan.filter(x => x.isCovered || this.preparedTodayIds.has(x.id)).length;
  }

  get dailyPercent(): number {
    return this.dailyTarget === 0 ? 0 : Math.min(100, Math.round((this.dailyDone / this.dailyTarget) * 100));
  }

  get focusQuestion(): AdminPrepQuestion | null {
    return this.dailyPlan[this.focusIndex] || this.nextQuestion;
  }

  get currentCategoryStat(): { category: string; total: number; covered: number; percent: number } | null {
    const category = this.focusQuestion?.category;
    return category ? this.categoryStats.find(stat => stat.category === category) || null : null;
  }

  get pending(): number {
    return Math.max(this.total - this.covered, 0);
  }

  get categoryStats(): Array<{ category: string; total: number; covered: number; percent: number }> {
    const map = new Map<string, { total: number; covered: number }>();
    for (const q of this.questions) {
      const current = map.get(q.category) || { total: 0, covered: 0 };
      current.total += 1;
      if (q.isCovered) current.covered += 1;
      map.set(q.category, current);
    }

    return Array.from(map.entries())
      .map(([category, stats]) => ({
        category,
        total: stats.total,
        covered: stats.covered,
        percent: stats.total === 0 ? 0 : Math.round((stats.covered / stats.total) * 100)
      }))
      .sort((a, b) => b.total - a.total);
  }

  get nextQuestion(): AdminPrepQuestion | null {
    return this.dailyPlan.find(q => !q.isCovered) || this.questions.find(q => !q.isCovered) || null;
  }

  showFocus(): void {
    this.viewMode = 'focus';
  }

  showLibrary(): void {
    this.viewMode = 'library';
  }

  selectFocusQuestion(index: number): void {
    if (index < 0 || index >= this.dailyPlan.length) return;
    this.focusIndex = index;
    this.focusTab = 'understand';
    this.draftAnswer = '';
  }

  notePreview(content: string): string {
    const plain = (content || '')
      .replace(/```[\s\S]*?```/g, ' Code example available in note. ')
      .replace(/[#*_>`\[\]()~-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return plain.length > 220 ? `${plain.slice(0, 217)}...` : plain;
  }

  previousQuestion(): void {
    this.selectFocusQuestion(this.focusIndex - 1);
  }

  nextFocusQuestion(): void {
    this.selectFocusQuestion(this.focusIndex + 1);
  }

  async focusQuestionById(question: AdminPrepQuestion): Promise<void> {
    let index = this.dailyPlan.findIndex(item => item.id === question.id);
    if (index < 0) {
      await this.planToday(question);
      index = this.dailyPlan.findIndex(item => item.id === question.id);
    }
    this.focusIndex = Math.max(index, 0);
    this.showFocus();
  }

  async focusCategory(category: string): Promise<void> {
    this.selectedCategory = category;
    await this.applyFilters();
  }

  goToImport(): void {
    this.router.navigate(['/admin/interview-prep/import']);
  }

  private todayKey(): string {
    return `admin-prep-prepared-${new Date().toISOString().slice(0, 10)}`;
  }

  private loadPreparedToday(): void {
    try {
      const raw = localStorage.getItem(this.todayKey());
      this.preparedTodayIds = new Set(raw ? JSON.parse(raw) : []);
    } catch {
      this.preparedTodayIds = new Set<string>();
    }
  }

  private savePreparedToday(): void {
    localStorage.setItem(this.todayKey(), JSON.stringify(Array.from(this.preparedTodayIds)));
  }

  trackById(_: number, question: AdminPrepQuestion): string {
    return question.id;
  }
}
