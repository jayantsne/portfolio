import {
  Component, OnInit, OnDestroy, ChangeDetectorRef,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { RoadmapService } from '../roadmap/roadmap.service';
import { AILearnService  } from '../services/ai-learn.service';
import { Roadmap, RoadmapNode } from '../roadmap/roadmap.models';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

type QuizState = 'loading' | 'ready' | 'done' | 'error';

@Component({
  selector: 'app-quiz',
  templateUrl: './quiz.component.html',
  styleUrls: ['./quiz.component.css'],
})
export class QuizComponent implements OnInit, OnDestroy {

  roadmap:   Roadmap | null = null;
  questions: QuizQuestion[] = [];

  state:   QuizState = 'loading';
  current = 0;
  score   = 0;

  /** Index of the selected answer for the current question (-1 = not yet answered) */
  selected = -1;
  /** True once the user has confirmed their answer */
  answered = false;

  private sub: Subscription | null = null;
  private moduleId = '';

  constructor(
    private route:    ActivatedRoute,
    private router:   Router,
    private rmSvc:    RoadmapService,
    private aiSvc:    AILearnService,
    private cdr:      ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.moduleId = this.route.snapshot.paramMap.get('moduleId') ?? '';
    this.roadmap  = this.rmSvc.getById(this.moduleId);
    if (!this.roadmap) { this.state = 'error'; this.cdr.markForCheck(); return; }
    this.generateQuestions(this.roadmap);
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  // ── AI quiz generation ────────────────────────────────────────────────────

  private generateQuestions(roadmap: Roadmap): void {
    this.state = 'loading';
    const topics = roadmap.nodes.map(n => n.topic).join(', ');
    const lang   = roadmap.language;

    const prompt =
      `Create a 5-question multiple-choice quiz about "${lang}" covering: ${topics}.\n\n` +
      `Return ONLY a valid JSON array with exactly this structure (no markdown fences):\n` +
      `[\n` +
      `  {\n` +
      `    "question": "...",\n` +
      `    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],\n` +
      `    "correctIndex": 0,\n` +
      `    "explanation": "Brief explanation of the correct answer."\n` +
      `  }\n` +
      `]\n\n` +
      `Make questions practical and clear. correctIndex is 0-based (0=A, 1=B, 2=C, 3=D).`;

    let raw = '';
    this.sub = this.aiSvc.getOllamaExplanation(prompt).subscribe({
      next: (res: any) => {
        if (res.done) {
          raw = res.explanation ?? '';
          this.parseQuestions(raw);
        }
      },
      error: () => {
        this.state = 'error';
        this.cdr.markForCheck();
      },
    });
  }

  private parseQuestions(raw: string): void {
    try {
      // Extract JSON array from the response
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('No JSON array found');
      const parsed: QuizQuestion[] = JSON.parse(match[0]);
      this.questions = parsed.slice(0, 10); // safety cap
      this.state     = this.questions.length ? 'ready' : 'error';
    } catch {
      this.state = 'error';
    }
    this.cdr.markForCheck();
  }

  retryGenerate(): void {
    if (this.roadmap) this.generateQuestions(this.roadmap);
  }

  // ── Quiz flow ─────────────────────────────────────────────────────────────

  select(index: number): void {
    if (this.answered) return;
    this.selected = index;
    this.cdr.markForCheck();
  }

  confirm(): void {
    if (this.selected === -1 || this.answered) return;
    this.answered = true;
    if (this.selected === this.questions[this.current].correctIndex) {
      this.score++;
    }
    this.cdr.markForCheck();
  }

  next(): void {
    if (this.current < this.questions.length - 1) {
      this.current++;
      this.selected = -1;
      this.answered = false;
    } else {
      this.state = 'done';
    }
    this.cdr.markForCheck();
  }

  restart(): void {
    this.current  = 0;
    this.score    = 0;
    this.selected = -1;
    this.answered = false;
    this.state    = 'loading';
    this.questions = [];
    if (this.roadmap) this.generateQuestions(this.roadmap);
  }

  goBack(): void {
    this.router.navigate(['/roadmap']);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  get progress(): number {
    return this.questions.length ? Math.round((this.current / this.questions.length) * 100) : 0;
  }

  get scorePercent(): number {
    return this.questions.length ? Math.round((this.score / this.questions.length) * 100) : 0;
  }

  get scoreLabel(): string {
    const p = this.scorePercent;
    if (p >= 90) return '🏆 Excellent!';
    if (p >= 70) return '✅ Well done!';
    if (p >= 50) return '📘 Keep practising!';
    return '💪 Review and retry!';
  }

  get currentQ(): QuizQuestion | null {
    return this.questions[this.current] ?? null;
  }

  getOptionClass(index: number): string {
    if (!this.answered) {
      return this.selected === index ? 'qz-opt qz-opt--selected' : 'qz-opt';
    }
    const q = this.currentQ!;
    if (index === q.correctIndex)          return 'qz-opt qz-opt--correct';
    if (index === this.selected)           return 'qz-opt qz-opt--wrong';
    return 'qz-opt';
  }

  trackByIndex(i: number): number { return i; }

  cleanOption(opt: string): string {
    return opt.replace(/^[A-D]\)\s*/, '');
  }
}
