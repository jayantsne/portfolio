import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  RevisionService, RevisionQuestion, RevisionQuestionsResponse,
} from '../shared/revision.service';

type Difficulty = 'easy' | 'medium' | 'hard';
type ScreenState = 'loading' | 'error' | 'question' | 'answer' | 'done';

interface QuestionState {
  question: RevisionQuestion;
  revealed: boolean;
  feedback: Difficulty | null;
}

@Component({
  selector: 'app-revision-session',
  templateUrl: './revision-session.component.html',
  styleUrls: ['./revision-session.component.css'],
})
export class RevisionSessionComponent implements OnInit {

  // ── Route params ─────────────────────────────────────────────────────
  noteId         = '';
  revisionItemId = '';

  // ── Session data ─────────────────────────────────────────────────────
  noteTopic       = '';
  questions:      QuestionState[] = [];
  currentIndex    = 0;
  screenState:    ScreenState = 'loading';
  isFallback      = false;

  // ── Feedback state ────────────────────────────────────────────────────
  submittingFeedback = false;

  // ── Toast ─────────────────────────────────────────────────────────────
  toast: { msg: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any;

  // ── Lifecycle ─────────────────────────────────────────────────────────
  constructor(
    private route:  ActivatedRoute,
    private router: Router,
    private revSvc: RevisionService,
    private cdr:    ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.noteId         = this.route.snapshot.paramMap.get('noteId') ?? '';
    this.revisionItemId = (history.state as any)?.revisionItemId ?? '';
    this.loadQuestions();
  }

  // ── Loading ────────────────────────────────────────────────────────────

  loadQuestions(): void {
    if (!this.noteId) {
      this.screenState = 'error';
      return;
    }
    this.screenState = 'loading';
    this.revSvc.getQuestions(this.noteId).subscribe({
      next: (res: RevisionQuestionsResponse) => {
        this.noteTopic  = res.noteTopic;
        this.isFallback = res.isFallback;
        this.questions  = res.questions.map(q => ({ question: q, revealed: false, feedback: null }));
        this.currentIndex = 0;
        this.screenState  = 'question';
        this.cdr.markForCheck();
      },
      error: () => {
        this.screenState = 'error';
        this.cdr.markForCheck();
      },
    });
  }

  // ── Getters ───────────────────────────────────────────────────────────

  get current(): QuestionState | null {
    return this.questions[this.currentIndex] ?? null;
  }

  get totalQuestions(): number { return this.questions.length; }

  get progressPercent(): number {
    return this.totalQuestions === 0 ? 0
      : Math.round((this.currentIndex / this.totalQuestions) * 100);
  }

  get questionTypeLabel(): string {
    const map: Record<string, string> = {
      conceptual: '💡 Conceptual',
      factual:    '📌 Factual',
      practical:  '🔧 Practical',
    };
    return map[this.current?.question.type ?? ''] ?? '❓ Question';
  }

  // ── Actions ───────────────────────────────────────────────────────────

  revealAnswer(): void {
    if (!this.current) return;
    this.current.revealed = true;
    this.screenState = 'answer';
    this.cdr.markForCheck();
  }

  submitFeedback(difficulty: Difficulty): void {
    if (!this.current || this.submittingFeedback) return;

    this.current.feedback  = difficulty;
    this.submittingFeedback = true;
    this.cdr.markForCheck();

    // If we have the revisionItemId, record the last question's feedback on the item.
    // Only do so on the FINAL question — one feedback per session is sufficient.
    const isLast = this.currentIndex === this.totalQuestions - 1;

    const advance = () => {
      this.submittingFeedback = false;
      if (isLast) {
        this.screenState = 'done';
      } else {
        this.currentIndex++;
        this.screenState = 'question';
      }
      this.cdr.markForCheck();
    };

    if (isLast && this.revisionItemId) {
      this.revSvc.submitFeedback(this.revisionItemId, difficulty).subscribe({
        next:  () => advance(),
        error: () => { this.showToast('Could not save progress', 'error'); advance(); },
      });
    } else {
      // For intermediate questions just advance immediately
      setTimeout(advance, 150);
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/revision']);
  }

  // ── DifficultyClass helpers ───────────────────────────────────────────

  feedbackClass(d: Difficulty): string {
    return `rs-fb-btn rs-fb-btn--${d}`;
  }

  // ── Toast ──────────────────────────────────────────────────────────────

  private showToast(msg: string, type: 'success' | 'error'): void {
    clearTimeout(this.toastTimer);
    this.toast = { msg, type };
    this.toastTimer = setTimeout(() => { this.toast = null; this.cdr.markForCheck(); }, 3000);
  }
}
