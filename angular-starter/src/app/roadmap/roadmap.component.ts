import {
  Component, OnInit, OnDestroy, ChangeDetectorRef,
  ElementRef, ViewChild,
} from '@angular/core';
import {
  trigger, state, style, animate, transition, keyframes,
} from '@angular/animations';
import { DomSanitizer } from '@angular/platform-browser';import { Router } from '@angular/router';import { Subscription } from 'rxjs';
import { CustomAuthService } from '../shared/custom-auth.service';
import { NotesService } from '../shared/notes.service';
import { RoadmapService } from './roadmap.service';
import { AILearnService } from '../services/ai-learn.service';
import {
  Roadmap, RoadmapNode, RoadmapProgress, WizardState,
  LANGUAGES, SKILL_LEVELS, GOALS, COMMITMENTS,
  AICourseFocus, ProgrammingLang, SkillLevel, LearningGoal, Commitment,
} from './roadmap.models';
import {
  LwTopic, LwSection, LwMessage, LwNote, MENTOR_CHIPS,
} from '../shared/learning-workspace/learning-workspace.models';

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

  /** Labels used in the labeled step stepper */
  readonly wizardSteps = ['Domain', 'Skill Level', 'Goal', 'Commitment', 'Preview'];

  // ── Generation stage animation ──────────────────────────────────────────
  generationStage = 0;
  readonly generationStageList = [
    { icon: '🔍', label: 'Analyzing your domain',        sub: 'Identifying core concepts and dependencies' },
    { icon: '🏗️', label: 'Designing learning structure',  sub: 'Ordering topics for optimal comprehension' },
    { icon: '🔢', label: 'Generating topic sequence',     sub: 'Crafting descriptions and time estimates' },
    { icon: '📚', label: 'Preparing learning resources',  sub: 'Finalizing your personalized roadmap' },
  ];
  private _stageTimer: any;

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

  // Streaming state for the lesson panel
  lessonStreamingText = '';
  lessonIsStreaming    = false;
  private lessonSub:  Subscription | null = null;

  // ── Right-panel tab ─────────────────────────────────────────────────────
  mentorPanelTab: 'mentor' | 'notes' = 'mentor';

  // ── Toast notification state ────────────────────────────────────────────
  toast: { msg: string; type: 'success' | 'error' | 'info' } | null = null;
  private toastTimer: any;

  showToast(msg: string, type: 'success' | 'error' | 'info' = 'info'): void {
    clearTimeout(this.toastTimer);
    this.toast = { msg, type };
    this.cdr.markForCheck();
    this.toastTimer = setTimeout(() => { this.toast = null; this.cdr.markForCheck(); }, 3500);
  }

  // ── Module Quiz navigation ───────────────────────────────────────────────
  /** Quiz question count shown on the sidebar button */
  get lwQuizCount(): number {
    return this.activeRoadmap?.nodes?.length ?? 0;
  }

  onQuizClick(): void {
    const id = this.activeRoadmap?.id;
    if (!id) return;
    this.router.navigate(['/quiz/module', id]);
  }

  // ── Panel collapse + Focus Mode ──────────────────────────────────────────
  leftPanelCollapsed  = this.loadPanelState('rm_left_collapsed',  false);
  rightPanelCollapsed = this.loadPanelState('rm_right_collapsed', false);
  focusMode           = false;

  readonly mentorChips = MENTOR_CHIPS;

  toggleLeftPanel():  void { this.leftPanelCollapsed  = !this.leftPanelCollapsed;  this.savePanelState('rm_left_collapsed',  this.leftPanelCollapsed);  this.cdr.markForCheck(); }
  toggleRightPanel(): void { this.rightPanelCollapsed = !this.rightPanelCollapsed; this.savePanelState('rm_right_collapsed', this.rightPanelCollapsed); this.cdr.markForCheck(); }
  toggleFocusMode():  void { this.focusMode = !this.focusMode; this.cdr.markForCheck(); }

  private loadPanelState(key: string, def: boolean): boolean {
    try { return JSON.parse(localStorage.getItem(key) ?? String(def)); } catch { return def; }
  }
  private savePanelState(key: string, val: boolean): void { localStorage.setItem(key, String(val)); }

  // ── Quick inline notes ───────────────────────────────────────────────────
  inlineNotes: { topic: string; text: string }[] = [];
  inlineNoteText = '';

  addInlineNote(): void {
    if (!this.inlineNoteText.trim()) return;
    this.inlineNotes.unshift({ topic: this.expandedNode?.topic ?? 'Note', text: this.inlineNoteText.trim() });
    this.inlineNoteText = '';
  }
  deleteInlineNote(i: number): void { this.inlineNotes.splice(i, 1); }

  // ── AI Code Lab (Playground, bottom) ────────────────────────────────────────
  pgCode     = '';        // code editor content
  pgLoading  = false;
  pgOutput   = '';
  pgError    = '';
  pgMs       = 0;
  pgAiMode: string = 'run';  /** Incrementing counter passed to playground to trigger auto-open on code injection */
  pgLoadToken = 0;  private pgSub: Subscription | null = null;

  /** Whether to show the playground — all AI roadmaps are code-relevant */
  get pgHasPlayground(): boolean { return !!this.activeRoadmap; }

  /** Active roadmap language label for the playground header */
  get pgLanguage(): string { return this.activeRoadmap?.language ?? ''; }

  /** Extract plain-text code blocks from the rendered lesson HTML */
  get pgLessonCodeBlocks(): string[] {
    const html = this.lessonText;
    if (!html) return [];
    const blocks: string[] = [];
    const re = /<code[^>]*>([\s\S]*?)<\/code>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const raw = m[1]
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
        .replace(/<[^>]+>/g, '').trim();
      if (raw.length > 10) blocks.push(raw);
    }
    return blocks;
  }

  /** SafeHtml version of pgOutput for the playground component */
  get pgOutputSafe() {
    return this.pgOutput
      ? this.sanitizer.bypassSecurityTrustHtml(this.pgOutput)
      : '';
  }

  resetPg(): void {
    this.pgSub?.unsubscribe();
    this.pgOutput = ''; this.pgError = '';
    this.pgLoading = false; this.pgMs = 0;
    this.cdr.markForCheck();
  }

  /** Called when playground emits { code, mode } from Run / AI action buttons */
  onPgRun(event: { code: string; mode: string }): void {
    const { code, mode } = event;
    const lang    = this.activeRoadmap?.language ?? 'code';
    const topic   = this.expandedNode?.topic ?? 'this topic';
    this.pgCode   = code;
    this.pgAiMode = mode;

    if (!code.trim() && mode !== 'challenge') return;
    if (this.pgLoading) return;

    this.pgSub?.unsubscribe();
    this.pgOutput  = '';
    this.pgError   = '';
    this.pgLoading = true;
    const t0 = Date.now();

    const prompts: Record<string, string> = {
      run:       `Execute this ${lang} code and show exactly what the output/result would be. Return only the console output or result value, formatted clearly:\n\`\`\`\n${code}\n\`\`\``,
      explain:   `Explain this ${lang} code step-by-step in simple terms. What does each part do?\n\`\`\`\n${code}\n\`\`\``,
      debug:     `Find and fix all bugs in this ${lang} code. List each issue you found and show the corrected code:\n\`\`\`\n${code}\n\`\`\``,
      optimize:  `Optimize this ${lang} code for better performance and readability. Show the improved version with a brief explanation of the changes:\n\`\`\`\n${code}\n\`\`\``,
      comments:  `Add clear, detailed explanatory comments to every significant line or block of this ${lang} code. Return the fully commented code:\n\`\`\`\n${code}\n\`\`\``,
      challenge: `Give me a hands-on coding challenge related to "${topic}" in ${lang}. Include:\n1. Clear problem statement\n2. Example input/output\n3. Hints\n4. Reference solution`,
    };

    const prompt = prompts[mode] ?? prompts['run'];

    this.pgSub = this.rmSvc.explainNode(
      { topic: prompt, description: '', order: 0, id: 'pg',
        estMinutes: 0, status: 'active', icon: '' } as any,
      lang as any,
      this.activeRoadmap?.level ?? 'intermediate'
    ).subscribe({
      next:     (r: any) => { this.pgOutput = r?.explanation ?? r?.text ?? JSON.stringify(r); },
      error:    (e: any) => { this.pgError = e?.message ?? 'Error. Please try again.'; this.pgLoading = false; this.cdr.markForCheck(); },
      complete: () => { this.pgMs = Date.now() - t0; this.pgLoading = false; this.cdr.markForCheck(); },
    });
  }

  /** Save note emitted from playground */
  onPgSaveNote(text: string): void {
    this.inlineNotes.unshift({
      topic: `[Code Lab] ${this.expandedNode?.topic ?? this.activeRoadmap?.language ?? 'Playground'}`,
      text,
    });
    this.cdr.markForCheck();
  }

  /** Called when user clicks “Run in Playground” on a lesson code section */
  onRunInPlayground(code: string): void {
    this.pgCode = code;
    this.pgLoadToken++;  // triggers ngOnChanges in playground to auto-open
    this.resetPg();
    this.cdr.markForCheck();
  }

  /** Add a quick mentor chip prompt as a user message and fetch the AI reply */
  sendMentorChip(prompt: string): void { this.lessonQuestion = prompt; this.sendLessonQuestion(); }

  /** Navigate to the previous topic in the roadmap */
  prevTopicNode(): void {
    if (!this.activeRoadmap || !this.expandedNode) return;
    const idx = this.activeRoadmap.nodes.indexOf(this.expandedNode);
    if (idx > 0) this.selectNodePanel(this.activeRoadmap.nodes[idx - 1]);
  }

  /** Navigate to the next topic in the roadmap */
  nextTopicNode(): void {
    if (!this.activeRoadmap || !this.expandedNode) return;
    const idx = this.activeRoadmap.nodes.indexOf(this.expandedNode);
    if (idx < this.activeRoadmap.nodes.length - 1) {
      this.selectNodePanel(this.activeRoadmap.nodes[idx + 1]);
    }
  }

  // ── LearningWorkspace adapter ─────────────────────────────────────────

  /** Converts active roadmap nodes to LwTopic array for the sidebar component */
  get lwTopics(): LwTopic[] {
    return (this.activeRoadmap?.nodes ?? []).map(n => ({
      id: n.id,
      title: n.topic,
      icon: n.icon,
      status: n.status as LwTopic['status'],
      estMinutes: n.estMinutes,
      description: n.description,
      order: n.order,
    }));
  }

  /** Converts the currently expanded RoadmapNode to an LwTopic */
  get lwActiveTopic(): LwTopic | null {
    const n = this.expandedNode;
    if (!n) return null;
    return {
      id: n.id, title: n.topic, icon: n.icon,
      status: n.status as LwTopic['status'],
      estMinutes: n.estMinutes, description: n.description, order: n.order,
    };
  }

  /** Wraps the initial AI lesson text into a single LwSection card */
  get lwSections(): LwSection[] {
    const text = this.lessonMessages[0]?.text;
    if (!text) return [];
    return [{ type: 'concept', title: 'AI Explanation', icon: '&#128214;', content: text }];
  }

  /** Messages after the initial AI explanation (index 1+) for the lesson thread */
  get lwFollowUpMessages(): LwMessage[] {
    return this.lessonMessages.slice(1).map(m => ({ role: m.role as 'user' | 'ai', text: m.text }));
  }

  /** All messages (follow-ups) shown in the mentor panel conversation */
  get lwMentorMessages(): LwMessage[] {
    return this.lwFollowUpMessages;
  }

  get lwHasPrev(): boolean {
    if (!this.activeRoadmap || !this.expandedNode) return false;
    return this.activeRoadmap.nodes.indexOf(this.expandedNode) > 0;
  }

  get lwHasNext(): boolean {
    if (!this.activeRoadmap || !this.expandedNode) return false;
    const idx = this.activeRoadmap.nodes.indexOf(this.expandedNode);
    return idx < this.activeRoadmap.nodes.length - 1;
  }

  get lwNotes(): LwNote[] {
    return this.inlineNotes.map(n => ({
      topicTitle: n.topic,
      text: n.text,
      createdAt: new Date(),
    }));
  }

  /** Handle topic selection from the LwSidebar */
  onLwTopicSelect(topic: LwTopic): void {
    const node = this.activeRoadmap?.nodes.find(n => n.id === topic.id);
    if (node) this.selectNodePanel(node);
  }

  /** Forward mentor send event to existing sendLessonQuestion() */
  onMentorSend(prompt: string): void {
    this.lessonQuestion = prompt;
    this.sendLessonQuestion();
  }

  /** Add a note from the mentor panel */
  onMentorAddNote(text: string): void {
    this.inlineNotes.unshift({ topic: this.expandedNode?.topic ?? 'Note', text });
    this.cdr.markForCheck();
  }

  @ViewChild('lessonBody')  lessonBodyEl?:  ElementRef<HTMLDivElement>;
  @ViewChild('mentorBody')  mentorBodyEl?:  ElementRef<HTMLDivElement>;

  // ── Side-panel note-saving state ──────────────────────────────────────
  saveNoteBusy = false;
  savedToNotes = false;

  private subs = new Subscription();

  constructor(
    public  auth:      CustomAuthService,
    private rmSvc:     RoadmapService,
    private aiSvc:     AILearnService,
    private notesSvc:  NotesService,
    private sanitizer: DomSanitizer,
    private cdr:       ChangeDetectorRef,
    private router:    Router,
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

  ngOnDestroy(): void { this.subs.unsubscribe(); this.pgSub?.unsubscribe(); this.lessonSub?.unsubscribe(); clearTimeout(this.toastTimer); clearInterval(this._stageTimer); }

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
    this.expandedNodeId = null;
    this.lessonNode     = null;
    this.lessonMessages = [];
    this.savedToNotes   = false;
    this.view           = 'view';

    // Auto-select the current active node so the right panel is not empty
    const active = this.progress.activeNode;
    if (active) {
      setTimeout(() => this.selectNodePanel(active), 50);
    }
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
    this.generationStage = 0;
    clearInterval(this._stageTimer);
    this._stageTimer = setInterval(() => {
      if (this.generationStage < 3) { this.generationStage++; this.cdr.markForCheck(); }
    }, 2400);

    let rawText = '';
    this.rmSvc.generateRoadmap(this.wizard).subscribe({
      next: (res: any) => {
        if (res?.explanation) rawText = res.explanation;
      },
      error: () => {
        clearInterval(this._stageTimer);
        this.generationStage = 3;
        this.isGenerating  = false;
        this.generateError = true;
        this.generatedNodes = this.rmSvc.parseNodes('');   // fallback nodes
        this.cdr.markForCheck();
      },
      complete: () => {
        clearInterval(this._stageTimer);
        this.generationStage = 3;
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

  /** Select a node for the right panel (sidebar click in view mode). */
  selectNodePanel(node: RoadmapNode): void {
    if (this.expandedNodeId === node.id) {
      // Deselect if clicking the already-selected node
      this.expandedNodeId = null;
      return;
    }
    this.expandedNodeId = node.id;
    this.savedToNotes   = false;
    if (node.status !== 'locked') {
      // Reuse existing lesson infrastructure to load content into the right panel
      this.lessonNode          = node;
      this.lessonMessages      = [];
      this.lessonQuestion      = '';
      this.lessonError         = false;
      this.loadLesson(node);
    } else {
      // Locked node — clear panel but don't call API
      this.lessonSub?.unsubscribe();
      this.lessonSub           = null;
      this.lessonNode          = node;
      this.lessonMessages      = [];
      this.lessonError         = false;
      this.lessonStreamingText = '';
      this.lessonIsStreaming   = false;
    }
  }

  /** Jump to the current active node in the sidebar panel. */
  resumeLearning(): void {
    const active = this.progress?.activeNode;
    if (active) this.selectNodePanel(active);
  }

  /** Save the current panel's lesson content to the user's Notes. */
  async saveNodeToNotes(): Promise<void> {
    if (!this.expandedNode || !this.lessonMessages.length || this.saveNoteBusy) return;
    const aiText = this.lessonMessages
      .filter(m => m.role === 'ai')
      .map(m => m.text)
      .join('\n\n---\n\n');
    if (!aiText.trim()) return;
    this.saveNoteBusy = true;
    try {
      await this.notesSvc.saveNote(
        this.expandedNode.topic,
        this.activeRoadmap?.language ?? 'Roadmap',
        aiText,
        ['roadmap', this.activeRoadmap?.language ?? '']
      );
      this.savedToNotes = true;
      setTimeout(() => { this.savedToNotes = false; }, 3000);
    } catch {
      // silently swallow — user still sees the content
    } finally {
      this.saveNoteBusy = false;
      this.cdr.markForCheck();
    }
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

    // Cancel any in-flight lesson request
    this.lessonSub?.unsubscribe();
    this.lessonSub        = null;

    // Reset state
    this.lessonLoading       = true;
    this.lessonError         = false;
    this.lessonIsStreaming   = false;
    this.lessonStreamingText = '';
    this.lessonMessages      = [];
    this.cdr.markForCheck();

    const lang  = this.activeRoadmap.language;
    const level = this.activeRoadmap.level;

    const prompt =
      `You are an expert AI teacher. Teach me "${node.topic}" in the context of ${lang} for a ${level} learner.\n\n` +
      `Structure your response as:\n` +
      `1. **What it is** — one-line essence\n` +
      `2. **Why it matters** — real-world significance\n` +
      `3. **How it works** — step-by-step explanation\n` +
      `4. **Practical example** — code or concrete walkthrough\n` +
      `5. **Key takeaway** — the one thing to remember\n\n` +
      `Be concise, visual with examples, and avoid unnecessary jargon.`;

    this.lessonSub = this.aiSvc.getOllamaExplanation(prompt).subscribe({
      next: (res: any) => {
        if (res.done) {
          // Stream finished — populate lesson messages, clear streaming state
          const finalText = res.explanation ?? '';
          this.lessonMessages      = [{ role: 'ai', text: finalText }];
          this.lessonStreamingText = '';
          this.lessonIsStreaming   = false;
          this.lessonLoading       = false;
          this.lessonError         = !res.success && !finalText;
          this.cdr.markForCheck();
          setTimeout(() => this.scrollLessonToBottom(), 100);
        } else {
          // Partial chunk arrived — switch from skeleton to streaming bubble
          if (this.lessonLoading) this.lessonLoading = false;
          this.lessonIsStreaming   = true;
          this.lessonStreamingText = res.explanation ?? '';
          this.cdr.markForCheck();
        }
      },
      error: () => {
        this.lessonLoading       = false;
        this.lessonIsStreaming   = false;
        this.lessonStreamingText = '';
        this.lessonError         = true;
        this.showToast('⚠️ Could not load lesson. Check your connection and retry.', 'error');
        this.cdr.markForCheck();
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
        this.showToast('⚠️ AI Mentor could not respond. Please try again.', 'error');
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

      // auto-advance to next active node in the panel
      const next = this.progress.activeNode;
      setTimeout(() => {
        this.justCompletedId = null;
        if (next && this.view === 'view') {
          this.selectNodePanel(next);           // load next lesson into right panel
        } else {
          this.expandedNodeId = next?.id ?? null;
        }
        this.cdr.markForCheck();
      }, 900);
    }

    // if we're in full-screen lesson view, go back to path
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
    const lessonEl = this.lessonBodyEl?.nativeElement;
    if (lessonEl) lessonEl.scrollTop = lessonEl.scrollHeight;
    const mentorEl = this.mentorBodyEl?.nativeElement;
    if (mentorEl) mentorEl.scrollTop = mentorEl.scrollHeight;
  }

  // Wizard label helpers for preview step
  get wizardLanguageLabel(): string { return this.wizard.language ?? ''; }
  get wizardLevelLabel():    string { return SKILL_LEVELS.find(l => l.value === this.wizard.level)?.label ?? ''; }
  get wizardGoalLabel():     string { return GOALS.find(g => g.value === this.wizard.goal)?.label ?? ''; }
  get wizardCommitLabel():   string { return COMMITMENTS.find(c => c.value === this.wizard.commitment)?.label ?? ''; }
  get wizardCommitHours():   string { return COMMITMENTS.find(c => c.value === this.wizard.commitment)?.hours ?? ''; }

  // ── Dashboard stats ──────────────────────────────────────────────────────
  get statsTotalRoadmaps():   number { return this.savedRoadmaps.length; }
  get statsActiveRoadmaps():  number {
    return this.savedRoadmaps.filter(r => {
      const p = this.getProgress(r);
      return p.percent > 0 && p.percent < 100;
    }).length;
  }
  get statsCompletedTopics(): number {
    return this.savedRoadmaps.reduce((sum, r) => sum + this.getProgress(r).completedCount, 0);
  }
  get statsBestStreak(): number {
    return this.savedRoadmaps.reduce((max, r) => Math.max(max, r.streakDays), 0);
  }

  /** Returns the next unlocked/active topic title for a roadmap card */
  getNextTopic(roadmap: Roadmap): string | null {
    const active = roadmap.nodes.find(n => n.status === 'active');
    return active?.topic ?? null;
  }

  /** Assigns a display type to a preview topic based on its position in the sequence */
  getTopicType(index: number): 'concept' | 'hands-on' | 'project' | 'review' {
    const cycle = index % 4;
    if (cycle === 0) return 'concept';
    if (cycle === 1) return 'hands-on';
    if (cycle === 2) return 'project';
    return 'review';
  }

  getTopicTypeLabel(index: number): string {
    const map: Record<string, string> = {
      'concept':  '📖 Concept',
      'hands-on': '🛠️ Hands-on',
      'project':  '🔨 Project',
      'review':   '✅ Review',
    };
    return map[this.getTopicType(index)];
  }
}
