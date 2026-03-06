import {
  Component, OnInit, OnDestroy, ChangeDetectorRef,
  ElementRef, ViewChild,
} from '@angular/core';
import {
  trigger, state, style, animate, transition, keyframes,
} from '@angular/animations';
import { Subscription } from 'rxjs';
import { CustomAuthService } from '../shared/custom-auth.service';
import { RoadmapService } from './roadmap.service';
import {
  Roadmap, RoadmapNode, RoadmapProgress, WizardState,
  LANGUAGES, SKILL_LEVELS, GOALS, COMMITMENTS,
  AICourseFocus, ProgrammingLang, SkillLevel, LearningGoal, Commitment,
} from './roadmap.models';

type ViewMode = 'auth-gate' | 'home' | 'create' | 'view' | 'lesson';

@Component({
  selector: 'app-roadmap',
  templateUrl: './roadmap.component.html',
  styleUrls: ['./roadmap.component.css'],
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(24px)' }),
        animate('400ms cubic-bezier(0.4,0,0.2,1)',
                style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease', style({ opacity: 1 })),
      ]),
    ]),
    trigger('nodeAnim', [
      transition('locked => active', [
        animate('600ms cubic-bezier(0.34,1.56,0.64,1)', keyframes([
          style({ transform: 'scale(0.6) translateY(20px)', opacity: 0,  offset: 0   }),
          style({ transform: 'scale(1.15)',                 opacity: 1,  offset: 0.7 }),
          style({ transform: 'scale(1)',                                 offset: 1   }),
        ])),
      ]),
      transition('active => completed', [
        animate('500ms cubic-bezier(0.34,1.56,0.64,1)', keyframes([
          style({ transform: 'scale(1)',    offset: 0   }),
          style({ transform: 'scale(1.4)', offset: 0.4 }),
          style({ transform: 'scale(0.9)', offset: 0.7 }),
          style({ transform: 'scale(1)',   offset: 1   }),
        ])),
      ]),
    ]),
    trigger('slideRight', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(40px)' }),
        animate('380ms cubic-bezier(0.4,0,0.2,1)',
                style({ opacity: 1, transform: 'translateX(0)' })),
      ]),
      transition(':leave', [
        animate('250ms ease',
                style({ opacity: 0, transform: 'translateX(40px)' })),
      ]),
    ]),
    trigger('expandPanel', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-12px) scale(0.97)' }),
        animate('300ms cubic-bezier(0.4,0,0.2,1)',
                style({ opacity: 1, transform: 'translateY(0) scale(1)' })),
      ]),
      transition(':leave', [
        animate('200ms ease', style({ opacity: 0, transform: 'translateY(-8px) scale(0.97)' })),
      ]),
    ]),
  ],
})
export class RoadmapComponent implements OnInit, OnDestroy {

  // ── Static config exposed to template ──────────────────────────────────
  languages     = LANGUAGES;
  skillLevels   = SKILL_LEVELS;
  goals         = GOALS;
  commitments   = COMMITMENTS;

  // ── View state ──────────────────────────────────────────────────────────
  view: ViewMode = 'auth-gate';

  // ── Home view ───────────────────────────────────────────────────────────
  savedRoadmaps:  Roadmap[]        = [];
  renamingId:     string | null    = null;
  renameValue:    string           = '';
  deleteConfirmId: string | null   = null;

  // ── Create wizard ───────────────────────────────────────────────────────
  wizardStep: number = 1;
  wizard: WizardState = { language: null, level: null, goal: null, commitment: null };
  isGenerating     = false;
  generateError    = false;
  generatedNodes:  RoadmapNode[] = [];

  // ── Roadmap view ────────────────────────────────────────────────────────
  activeRoadmap:   Roadmap | null       = null;
  progress:        RoadmapProgress | null = null;
  expandedNodeId:  string | null        = null;
  justCompletedId: string | null        = null;   // triggers burst animation

  // ── Lesson panel ────────────────────────────────────────────────────────
  lessonNode:      RoadmapNode | null   = null;
  lessonText:      string               = '';
  lessonLoading    = false;
  lessonError      = false;
  lessonQuestion:  string               = '';
  lessonFollowUpLoading = false;
  lessonMessages:  { role: 'user' | 'ai'; text: string }[] = [];

  @ViewChild('lessonBody') lessonBodyEl?: ElementRef<HTMLDivElement>;

  private subs = new Subscription();

  constructor(
    public  auth:    CustomAuthService,
    private rmSvc:   RoadmapService,
    private cdr:     ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.subs.add(
      this.auth.currentUser$.subscribe(user => {
        if (user) {
          this.loadHome();
        } else {
          this.view         = 'auth-gate';
          this.savedRoadmaps = [];
        }
        this.cdr.markForCheck();
      })
    );
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  // ─── Navigation ─────────────────────────────────────────────────────────

  loadHome(): void {
    this.savedRoadmaps = this.rmSvc.loadAll();
    this.view          = 'home';
  }

  goHome(): void {
    this.activeRoadmap  = null;
    this.lessonNode     = null;
    this.expandedNodeId = null;
    this.loadHome();
  }

  openCreateWizard(): void {
    this.wizard         = { language: null, level: null, goal: null, commitment: null };
    this.wizardStep     = 1;
    this.generateError  = false;
    this.generatedNodes = [];
    this.view           = 'create';
  }

  openRoadmap(roadmap: Roadmap): void {
    // refresh from storage and touch lastAccessed
    const fresh = this.rmSvc.getById(roadmap.id);
    if (!fresh) return;
    fresh.lastAccessedAt = new Date().toISOString();
    this.rmSvc.save(fresh);

    this.activeRoadmap  = fresh;
    this.progress       = this.rmSvc.computeProgress(fresh.nodes);
    this.expandedNodeId = this.progress.activeNode?.id ?? null;
    this.lessonNode     = null;
    this.view           = 'view';
  }

  // ─── Wizard ─────────────────────────────────────────────────────────────

  selectLanguage(lang: AICourseFocus): void { this.wizard.language   = lang;  }
  selectLevel(lvl: SkillLevel):           void { this.wizard.level      = lvl;   }
  selectGoal(g: LearningGoal):            void { this.wizard.goal       = g;     }
  selectCommitment(c: Commitment):        void { this.wizard.commitment = c;     }

  wizardNext(): void {
    if (this.wizardStep < 4) { this.wizardStep++; return; }
    this.generateRoadmap();
  }

  wizardBack(): void {
    if (this.wizardStep > 1) this.wizardStep--;
    else this.view = 'home';
  }

  canAdvanceWizard(): boolean {
    switch (this.wizardStep) {
      case 1: return !!this.wizard.language;
      case 2: return !!this.wizard.level;
      case 3: return !!this.wizard.goal;
      case 4: return !!this.wizard.commitment;
      default: return false;
    }
  }

  private generateRoadmap(): void {
    this.isGenerating  = true;
    this.generateError = false;
    this.wizardStep    = 5;   // preview step (loading state)

    let rawText = '';
    this.rmSvc.generateRoadmap(this.wizard).subscribe({
      next: (res: any) => {
        if (res?.explanation) rawText = res.explanation;
      },
      error: () => {
        this.isGenerating  = false;
        this.generateError = true;
        this.generatedNodes = this.rmSvc.parseNodes('');   // fallback nodes
        this.cdr.markForCheck();
      },
      complete: () => {
        this.isGenerating   = false;
        this.generatedNodes = this.rmSvc.parseNodes(rawText);
        this.cdr.markForCheck();
      },
    });
  }

  retryGenerate(): void { this.generateRoadmap(); }

  saveGeneratedRoadmap(): void {
    if (!this.generatedNodes.length) return;
    const roadmap = this.rmSvc.buildRoadmap(this.wizard, this.generatedNodes);
    this.rmSvc.save(roadmap);
    this.openRoadmap(roadmap);
  }

  // ─── Roadmap View ────────────────────────────────────────────────────────

  toggleExpandNode(nodeId: string): void {
    this.expandedNodeId = this.expandedNodeId === nodeId ? null : nodeId;
  }

  openLesson(node: RoadmapNode): void {
    if (node.status === 'locked') return;
    this.lessonNode      = node;
    this.lessonText      = '';
    this.lessonError     = false;
    this.lessonMessages  = [];
    this.lessonQuestion  = '';
    this.view            = 'lesson';
    this.loadLesson(node);
  }

  loadLesson(node: RoadmapNode): void {
    if (!this.activeRoadmap) return;
    this.lessonLoading = true;
    let text           = '';

    this.rmSvc.explainNode(node, this.activeRoadmap.language, this.activeRoadmap.level)
      .subscribe({
        next: (res: any) => { if (res?.explanation) text = res.explanation; },
        error: () => {
          this.lessonLoading = false;
          this.lessonError   = true;
          this.cdr.markForCheck();
        },
        complete: () => {
          this.lessonLoading = false;
          this.lessonText    = text;
          this.lessonMessages = [{ role: 'ai', text }];
          this.cdr.markForCheck();
          setTimeout(() => this.scrollLessonToBottom(), 100);
        },
      });
  }

  sendLessonQuestion(): void {
    const q = this.lessonQuestion.trim();
    if (!q || !this.activeRoadmap || !this.lessonNode) return;
    this.lessonMessages.push({ role: 'user', text: q });
    this.lessonQuestion      = '';
    this.lessonFollowUpLoading = true;
    let reply = '';

    const prompt = `In the context of "${this.lessonNode.topic}" in ${this.activeRoadmap.language}: ${q}`;
    this.rmSvc.explainNode(
      { ...this.lessonNode, topic: prompt } as RoadmapNode,
      this.activeRoadmap.language,
      this.activeRoadmap.level,
    ).subscribe({
      next: (res: any) => { if (res?.explanation) reply = res.explanation; },
      error: () => {
        this.lessonFollowUpLoading = false;
        this.lessonMessages.push({ role: 'ai', text: '⚠️ Could not get a response. Please try again.' });
        this.cdr.markForCheck();
      },
      complete: () => {
        this.lessonFollowUpLoading = false;
        this.lessonMessages.push({ role: 'ai', text: reply });
        this.cdr.markForCheck();
        setTimeout(() => this.scrollLessonToBottom(), 100);
      },
    });
  }

  markComplete(node: RoadmapNode): void {
    if (!this.activeRoadmap || node.status !== 'active') return;
    this.justCompletedId = node.id;

    const updated = this.rmSvc.markNodeComplete(this.activeRoadmap.id, node.id);
    if (updated) {
      this.activeRoadmap  = updated;
      this.progress       = this.rmSvc.computeProgress(updated.nodes);

      // auto-expand next active node
      const next = this.progress.activeNode;
      setTimeout(() => {
        this.justCompletedId = null;
        this.expandedNodeId  = next?.id ?? null;
        this.cdr.markForCheck();
      }, 900);
    }

    // if we're in lesson view, go back to path
    if (this.view === 'lesson') this.view = 'view';
  }

  backToPath(): void {
    this.view       = 'view';
    this.lessonNode = null;
  }

  // ─── Rename / Delete ─────────────────────────────────────────────────────

  startRename(roadmap: Roadmap): void {
    this.renamingId  = roadmap.id;
    this.renameValue = roadmap.title;
  }

  confirmRename(): void {
    if (this.renamingId && this.renameValue.trim()) {
      this.rmSvc.rename(this.renamingId, this.renameValue.trim());
      this.savedRoadmaps = this.rmSvc.loadAll();
    }
    this.renamingId = null;
  }

  deleteRoadmap(id: string): void {
    this.rmSvc.delete(id);
    this.savedRoadmaps    = this.rmSvc.loadAll();
    this.deleteConfirmId  = null;
  }

  // ─── Utility ─────────────────────────────────────────────────────────────

  getProgress(roadmap: Roadmap): RoadmapProgress {
    return this.rmSvc.computeProgress(roadmap.nodes);
  }

  getLevelLabel(level: string): string {
    return SKILL_LEVELS.find(l => l.value === level)?.label ?? level;
  }

  getGoalLabel(goal: string): string {
    return GOALS.find(g => g.value === goal)?.label ?? goal;
  }

  getLanguageIcon(lang: string): string {
    return LANGUAGES.find(l => l.value === lang)?.icon ?? '💻';
  }

  getLevelIcon(level: string): string {
    return SKILL_LEVELS.find(l => l.value === level)?.icon ?? '📘';
  }

  isNodeJustCompleted(node: RoadmapNode): boolean {
    return this.justCompletedId === node.id;
  }

  /** Returns the node currently expanded (for detail panel in flow view) */
  get expandedNode(): RoadmapNode | null {
    if (!this.activeRoadmap || !this.expandedNodeId) return null;
    return this.activeRoadmap.nodes.find(n => n.id === this.expandedNodeId) ?? null;
  }

  private scrollLessonToBottom(): void {
    if (this.lessonBodyEl?.nativeElement) {
      const el = this.lessonBodyEl.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  // Wizard label helpers for preview step
  get wizardLanguageLabel(): string { return this.wizard.language ?? ''; }
  get wizardLevelLabel():    string { return SKILL_LEVELS.find(l => l.value === this.wizard.level)?.label ?? ''; }
  get wizardGoalLabel():     string { return GOALS.find(g => g.value === this.wizard.goal)?.label ?? ''; }
  get wizardCommitLabel():   string { return COMMITMENTS.find(c => c.value === this.wizard.commitment)?.label ?? ''; }
  get wizardCommitHours():   string { return COMMITMENTS.find(c => c.value === this.wizard.commitment)?.hours ?? ''; }
}
