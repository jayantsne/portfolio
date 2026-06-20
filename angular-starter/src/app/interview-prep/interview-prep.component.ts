import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { QuestionsDataService, InterviewQuestion } from '../shared/questions-data.service';
import { AILearnService } from '../services/ai-learn.service';
import { InterviewRoadmapService } from '../services/interview-roadmap.service';
import { CustomAuthService } from '../shared/custom-auth.service';
import { AuthTriggerService } from '../shared/auth-trigger.service';
import { NotesService } from '../shared/notes.service';

interface AIMessage {
  role: 'user' | 'ai';
  text: string;           // Display text shown in the UI
  _sendContent?: string;  // Full prompt/context sent to AI (never rendered)
  timestamp: Date;
}

interface SavedNote {
  questionId: number;
  question: string;
  category: string;
  difficulty?: string;
  answer: string;
  savedAt: string;
}

// ─── Roadmap types ────────────────────────────────────────────────────────────
export interface RoadmapTopic {
  id: string;
  text: string;
  done: boolean;
}

export interface RoadmapSection {
  id: string;
  title: string;
  emoji: string;
  topics: RoadmapTopic[];
  expanded: boolean;
}

export interface TechStack {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const TECH_STACKS: TechStack[] = [
  { id: 'angular',       name: 'Angular',        icon: '🅰️',  color: '#dd0031' },
  { id: 'react',         name: 'React',           icon: '⚛️',  color: '#61dafb' },
  { id: 'nodejs',        name: 'Node.js',         icon: '🟢',  color: '#339933' },
  { id: 'typescript',    name: 'TypeScript',      icon: '📘',  color: '#3178c6' },
  { id: 'dotnet',        name: '.NET Core',       icon: '🔷',  color: '#512bd4' },
  { id: 'python',        name: 'Python',          icon: '🐍',  color: '#3776ab' },
  { id: 'java',          name: 'Java',            icon: '☕',  color: '#f89820' },
  { id: 'system-design', name: 'System Design',   icon: '🏗️',  color: '#6366f1' },
  { id: 'devops',        name: 'DevOps / CI-CD',  icon: '🔄',  color: '#0ea5e9' },
  { id: 'sql',           name: 'SQL & Databases', icon: '🗄️',  color: '#00758f' },
  { id: 'docker',        name: 'Docker / K8s',    icon: '🐳',  color: '#2496ed' },
  { id: 'vue',           name: 'Vue.js',          icon: '💚',  color: '#42b883' },
];

@Component({
  selector: 'app-interview-prep',
  templateUrl: './interview-prep.component.html',
  styleUrls: ['./interview-prep.component.css'],
  animations: [
    trigger('panelSlide', [
      state('void', style({ opacity: 0, transform: 'translateX(40px)' })),
      state('*',    style({ opacity: 1, transform: 'translateX(0)' })),
      transition(':enter', animate('300ms ease-out')),
      transition(':leave', animate('200ms ease-in')),
    ]),
    trigger('msgFade', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class InterviewPrepComponent implements OnInit, OnDestroy {
  /* ─── View mode ─────────────────────────────────────────── */
  sidebarTab: 'questions' | 'roadmap' = 'questions';
  /** Tab the guest was trying to open — auto-activated after login. */
  pendingTab:  'roadmap' | null       = null;

  /* ─── Data ─────────────────────────────────────────────── */
  allQuestions: InterviewQuestion[] = [];
  filteredQuestions: InterviewQuestion[] = [];

  /* ─── Filters ───────────────────────────────────────────── */
  searchTerm = '';
  selectedCategory = 'all';
  selectedDifficulty = 'all';

  /* ─── Selection ────────────────────────────────────────── */
  selectedQuestion: InterviewQuestion | null = null;

  /* ─── AI state ──────────────────────────────────────────── */
  aiMessages: AIMessage[] = [];
  streamingText = '';
  isLoadingAI = false;
  followUpText = '';
  isFollowUpLoading = false;

  /* ─── Notes ─────────────────────────────────────────────── */
  savedNotes: SavedNote[] = [];
  noteSaved = false;
  showNotesDrawer = false;
  /** Controls the floating related-questions panel visibility */
  showToolsPanel = false;
  /** Mobile: controls sidebar drawer open/close */
  showMobileSidebar = false;
  /** Shown when a guest tries to save — prompts them to sign in. */
  showLoginPrompt = false;

  /** Active answer mode — controls what style of structured prompt is sent to the AI. */
  answerMode: string = 'normal';

  readonly MODE_LABELS = [
    { key: 'normal',         label: '📋 Standard',       hint: 'Balanced explanation with a real-world example' },
    { key: 'simple',         label: '🧩 Simple',          hint: 'Plain English, analogy-first, no jargon' },
    { key: 'analogy',        label: '🎭 Analogy',         hint: 'Real-world analogy that makes the concept stick' },
    { key: 'code',           label: '💻 Code',            hint: 'Code-first answer with working examples' },
    { key: 'mistakes',       label: '❌ Mistakes',        hint: 'Most common mistakes and how to avoid them' },
    { key: 'best_practices', label: '⭐ Best Practices',  hint: 'Senior-level production insights' },
    { key: 'interview_tips', label: '🎯 Interview Tips',  hint: 'How to deliver this answer in an interview' },
  ] as const;

  /* ─── Roadmap state ──────────────────────────────────────── */
  readonly techStacks = TECH_STACKS;
  selectedStack: TechStack | null = null;
  roadmapSections: RoadmapSection[] = [];
  isGeneratingRoadmap = false;
  roadmapError = '';
  roadmapProgress = 0;           // 0-100 for the generation progress bar
  activeTopic: string | null = null;  // which topic is being explained in chat
  roadmapNoteSaved = false;      // flash feedback after Save to Notes

  // ── Backend sync state ───────────────────────────────────────────
  savedRoadmapId   = '';      // MongoDB _id once the roadmap is persisted
  roadmapSyncing   = false;   // spinner while saving / updating to backend
  roadmapSynced    = false;   // “Saved ✓” flash for 2 s
  roadmapSyncError = false;   // error flash
  private progressDebounce: any = null;

  private progressTimer: any;
  private roadmapSub?: Subscription;

  /* ─── UI helpers ────────────────────────────────────────── */
  get categories(): string[] {
    const cats = new Set(this.allQuestions.map(q => q.category));
    return Array.from(cats).sort();
  }

  get difficulties(): string[] {
    return ['Easy', 'Medium', 'Hard'];
  }

  get unreadCount(): number {
    return 0; // future feature
  }

  /**
   * Detects student intent so the follow-up prompt takes the right angle.
   */
  private detectIntent(text: string): 'confused' | 'why' | 'how' | 'example' | 'normal' {
    const t = text.trim().toLowerCase();
    const confused =
      (t.length <= 20 && !t.includes('?')) ||
      /\b(not getting|don't get|dont get|confused|lost|unclear|still don.t|makes no sense|huh|what does that mean|no idea|can.t follow)\b/.test(t);
    if (confused) return 'confused';
    if (/^why\b/.test(t) || /\bwhy (is|does|do|did|would|should)\b/.test(t)) return 'why';
    if (/^how\b/.test(t) || /\bhow (do|does|did|can|would|to)\b/.test(t)) return 'how';
    if (/\b(show me|example|code|demo|snippet|write|implement)\b/.test(t)) return 'example';
    return 'normal';
  }

  /** Extract follow-up suggestions from the AI message — supports both rigid and flexible formats */
  get suggestedFollowUps(): string[] {
    const lastAi = [...this.aiMessages].reverse().find(m => m.role === 'ai');
    if (!lastAi) return [];

    // Try new flexible "**Explore more:**" block first
    const flexMatch = lastAi.text.match(/\*{0,2}Explore more[:\*]*\*{0,2}[\s\S]*?\n(([\s\S]*?)(?=\n##|\n\*\*[A-Z]|$))/i);
    if (flexMatch) {
      const lines = flexMatch[1].split('\n')
        .map(l => l.replace(/^\s*[-*\d.\[\]]+\s*/, '').replace(/[\[\]]/g, '').trim())
        .filter(l => l.length > 10 && l.length < 160 && !l.startsWith('#'));
      if (lines.length > 0) return lines.slice(0, 3);
    }

    // Fallback: legacy "## Common Follow-up Questions" section
    const match = lastAi.text.match(/##\s*Common Follow-up Questions[\s\S]*?\n(([\s\S]*?)(?=\n##|$))/);
    if (!match) return [];
    return match[1]
      .split('\n')
      .map(l => l.replace(/^\s*[-*\d.]+\s*/, '').trim())
      .filter(l => l.length > 10 && l.length < 160 && !l.startsWith('#'))
      .slice(0, 3);
  }

  sendSuggestedFollowUp(question: string): void {
    // Suggested follow-up chips: pass question as display text,
    // build a context-aware prompt as _sendContent so it continues the conversation
    const lastAI = [...this.aiMessages].reverse().find(m => m.role === 'ai')?.text?.slice(0, 800) ?? '';
    const q = this.selectedQuestion;
    const ctxPrompt =
      `You are a senior technical interview coach. Keep the conversation flowing naturally.\n` +
      `No filler phrases. Don't repeat what was already covered.\n\n` +
      (q ? `Current interview topic: "${q.question}" (${q.category})\n\n` : '') +
      (lastAI ? `What was just explained:\n${lastAI}\n\n` : '') +
      `The student asks a follow-up: "${question}"\n\n` +
      `Answer conversationally (2-4 short paragraphs). Use code only if it genuinely helps. ` +
      `Wrap code in fenced blocks. Bold key terms on first use. ` +
      `End with one natural check-in: "Does that make sense?" or "Want to dig deeper?"\n\n` +
      `After your answer add EXACTLY:\n**Explore more:**\n- [follow-up question 1?]\n- [follow-up question 2?]`;
    this.followUpText = question;
    this._sendFollowUpWithContext(question, ctxPrompt);
  }

  /** Context-aware chip actions — each one modifies/extends the last AI response */
  sendChipAction(type: string): void {
    const lastAI = [...this.aiMessages].reverse().find(m => m.role === 'ai')?.text?.slice(0, 1000) ?? '';
    const q = this.selectedQuestion;
    const topic = q?.question ?? 'this topic';
    const cat   = q ? ` (${q.category})` : '';

    const SYS =
      `You are a brilliant technical interview coach. Natural, direct tone.\n` +
      `Never start with filler ("Sure!", "Certainly!", "Great question!"). ` +
      `Build on what was already explained — don't repeat it, extend it.\n\n`;
    const prevCtx = lastAI
      ? `The student just read this about "${topic}"${cat}:\n---\n${lastAI}\n---\n\n`
      : `The student is preparing for an interview question: "${topic}"${cat}\n\n`;
    const EXPLORE =
      `\n\nAfter your response add EXACTLY:\n` +
      `**Explore more:**\n- [follow-up question 1?]\n- [follow-up question 2?]`;

    const labels: Record<string, string> = {
      'show-solution':   '💻 Show me the code',
      'explain-simpler': '💡 Explain simpler',
      'common-mistakes': '❌ Common mistakes',
      'code-example':    '⚡ Code example',
      'best-practices':  '⭐ Best practices',
    };
    const label = labels[type] ?? type;

    const prompts: Record<string, string> = {
      'show-solution':
        SYS + prevCtx +
        `Give a complete, well-commented code solution for "${topic}".\n` +
        `ONE realistic example (15-30 lines). Every non-obvious line has an inline comment. ` +
        `After the code, 2-3 sentences on what to highlight when explaining it to an interviewer. ` +
        `Wrap in fenced block with language identifier.` + EXPLORE,

      'explain-simpler':
        SYS + prevCtx +
        `The student didn't fully get the explanation above. Re-explain from scratch using a completely different angle.\n` +
        `- Open with ONE sentence that captures the whole idea in plain English\n` +
        `- Use a real-world non-tech analogy (coffee shop, traffic light, restaurant — anything relatable)\n` +
        `- ONE tiny code example (≤8 lines) showing the simplest possible usage\n` +
        `- Close with: "Does that click? What part is still fuzzy?"\n` +
        `Short paragraphs (2-3 sentences max). Zero jargon unless you define it.` + EXPLORE,

      'common-mistakes':
        SYS + prevCtx +
        `Show the 3 most common mistakes developers make with "${topic}" in interviews and production.\n` +
        `For each mistake: broken code (4-8 lines) → fixed code (4-8 lines), inline comments showing WHY. ` +
        `One memorable rule after each. Conversational tone — "the sneaky thing here is...". ` +
        `Close with the single most dangerous misconception about this topic.` + EXPLORE,

      'code-example':
        SYS + prevCtx +
        `Give ONE realistic, self-contained code example for "${topic}" that extends the explanation above.\n` +
        `15-20 lines, real use case, every non-trivial line commented. ` +
        `After the code: point out the 2-3 things to notice in 2-3 sentences. ` +
        `No rigid walkthrough headers — weave the explanation naturally.` + EXPLORE,

      'best-practices':
        SYS + prevCtx +
        `Share the senior-level best practices for "${topic}" that would impress an interviewer.\n` +
        `3-4 practices, each as a short story (not a bullet dump): what junior devs do, what seniors do, why it matters. ` +
        `Include a code snippet only when it makes the difference concrete. ` +
        `End with one thing that would make an interviewer immediately trust the candidate’s experience.` + EXPLORE,
    };

    if (!prompts[type]) return;
    this.followUpText = label;
    this._sendFollowUpWithContext(label, prompts[type]);
  }

  @ViewChild('msgContainer') msgContainer!: ElementRef;

  private sub!: Subscription;
  private aiSub?: Subscription;

  /** Whether the current visitor is authenticated. Updated reactively via currentUser$. */
  isLoggedIn = false;

  constructor(
    private questionsData: QuestionsDataService,
    private aiLearnService: AILearnService,
    private roadmapBackend: InterviewRoadmapService,
    private customAuth: CustomAuthService,
    private router: Router,
    private authTrigger: AuthTriggerService,
    private notesSvc: NotesService,
  ) {}

  ngOnInit(): void {
    this.sub = this.questionsData.questions$.subscribe(qs => {
      this.allQuestions = qs;
      this.applyFilters();
    });
    const stored = localStorage.getItem('ip_saved_notes');
    if (stored) {
      try { this.savedNotes = JSON.parse(stored); } catch { this.savedNotes = []; }
    }

    // Sync auth state reactively so template updates when user logs in/out
    this.isLoggedIn = this.customAuth.isLoggedIn;
    this.customAuth.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
      if (user && this.pendingTab) {
        this.sidebarTab = this.pendingTab;
        this.pendingTab = null;
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.aiSub?.unsubscribe();
    this.roadmapSub?.unsubscribe();
    clearInterval(this.progressTimer);
    clearTimeout(this.progressDebounce);
  }

  /* ─── Roadmap ─────────────────────────────────────────────── */
  selectStack(stack: TechStack): void {
    if (this.selectedStack?.id === stack.id && this.roadmapSections.length) return;
    this.selectedStack = stack;
    this.roadmapError = '';
    this.activeTopic = null;

    // Restore a previously generated roadmap from localStorage
    const savedSections = this.loadRoadmapStructure(stack.id);
    if (savedSections && savedSections.length) {
      this.roadmapSections = savedSections;
      const progress = this.loadRoadmapProgress(stack.id);
      if (progress) {
        this.roadmapSections.forEach(sec =>
          sec.topics.forEach(t => { t.done = progress.includes(t.id); })
        );
      }
      return; // resume immediately — no AI call
    }

    this.roadmapSections = [];
    this.generateRoadmap();
  }

  generateRoadmap(): void {
    if (!this.selectedStack || this.isGeneratingRoadmap) return;
    this.isGeneratingRoadmap = true;
    this.roadmapError = '';
    this.roadmapSections = [];
    this.roadmapProgress = 0;
    this.activeTopic = null;

    // Fake progress ticker so the UI feels alive while streaming
    this.progressTimer = setInterval(() => {
      if (this.roadmapProgress < 88) this.roadmapProgress += 4;
    }, 300);

    const stack = this.selectedStack;
    const prompt =
      `You are an expert technical interview coach with 15+ years of industry experience.\n\n` +
      `Generate a comprehensive, structured interview preparation roadmap for: **${stack.name}**\n\n` +
      `Your roadmap must follow this EXACT format — no deviations:\n\n` +
      `## 1. <Phase Title>\n` +
      `- Topic 1\n` +
      `- Topic 2\n` +
      `- Topic 3\n\n` +
      `## 2. <Phase Title>\n` +
      `...\n\n` +
      `Requirements:\n` +
      `- Generate exactly 6 to 8 numbered phases\n` +
      `- Each phase has 4 to 8 bullet-point topics\n` +
      `- Phase titles should be interview-focused (e.g. "Fundamentals", "Core Concepts", "Advanced Topics", "System Design", "Interview Practice")\n` +
      `- Topics must be specific and actionable — not vague\n` +
      `- Cover fundamentals → advanced → interview-specific in sequence\n` +
      `- Final phase must be "Interview Practice" with sample question types\n` +
      `- ONLY use ## headings and - bullets. No other formatting.\n` +
      `- Do NOT include any introduction, conclusion, or explanation outside the roadmap structure.`;

    this.roadmapSub?.unsubscribe();
    this.roadmapSub = this.aiLearnService.getOllamaExplanation(prompt).subscribe({
      next: (res: any) => {
        if (res.done) {
          clearInterval(this.progressTimer);
          this.roadmapProgress = 100;
          const parsed = this.parseRoadmap(res.explanation || '');
          if (parsed.length === 0) {
            this.roadmapError = 'Could not parse the roadmap. Please try again.';
          } else {
            this.roadmapSections = parsed;
            // Restore done-state from localStorage
            const saved = this.loadRoadmapProgress(stack.id);
            if (saved) {
              this.roadmapSections.forEach(sec => {
                sec.topics.forEach(t => {
                  t.done = saved.includes(t.id);
                });
              });
            }
            // Persist the full structure so resuming is instant next visit
            this.saveRoadmapStructure(stack.id);
            // Auto-save to backend (fire-and-forget)
            if (this.customAuth.isLoggedIn) {
              this.autoSaveToBackend(stack);
            }
          }
          this.isGeneratingRoadmap = false;
          setTimeout(() => { this.roadmapProgress = 0; }, 600);
        }
        // We don't stream roadmap sections incrementally — wait for the full response
      },
      error: () => {
        clearInterval(this.progressTimer);
        this.isGeneratingRoadmap = false;
        this.roadmapProgress = 0;
        this.roadmapError = '⚠️ Failed to generate roadmap. Please try again.';
      },
    });
  }

  /** Parse the AI markdown into RoadmapSection[] */
  private parseRoadmap(text: string): RoadmapSection[] {
    const sections: RoadmapSection[] = [];
    // Split on ## headings
    const chunks = text.split(/\n(?=##\s)/);
    const sectionEmojis = ['📌', '🧠', '⚙️', '🚀', '🏗️', '🔬', '⭐', '🎯'];

    for (const chunk of chunks) {
      const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean);
      if (!lines.length) continue;

      // First line is the heading
      const headingLine = lines[0].replace(/^##\s*/, '').trim();
      if (!headingLine) continue;

      // Number prefix "1. Title" or just "Title"
      const titleMatch = headingLine.match(/^\d+\.\s*(.+)$/);
      const title = titleMatch ? titleMatch[1].trim() : headingLine;
      const secIdx = sections.length;
      const secId = `sec-${secIdx}`;

      const topics: RoadmapTopic[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('-') || line.startsWith('*') || line.match(/^\d+\.\s/)) {
          const topicText = line.replace(/^[-*\d.]+\s*/, '').trim();
          if (topicText.length > 2) {
            topics.push({
              id: `${secId}-t${topics.length}`,
              text: topicText,
              done: false,
            });
          }
        }
      }

      if (topics.length) {
        sections.push({
          id: secId,
          title,
          emoji: sectionEmojis[secIdx % sectionEmojis.length],
          topics,
          expanded: secIdx === 0, // first section open by default
        });
      }
    }
    return sections;
  }

  toggleSection(sec: RoadmapSection): void {
    sec.expanded = !sec.expanded;
  }

  /** User clicks a roadmap topic → open AI explanation in chat panel */
  askAboutTopic(topic: RoadmapTopic, section: RoadmapSection): void {
    this.activeTopic = topic.id;
    const stack = this.selectedStack!;
    const fakeQuestion: InterviewQuestion = {
      id: -1,
      question: `Explain "${topic.text}" for a ${stack.name} interview`,
      answer: '',
      category: stack.name,
      difficulty: 'Medium',
      tags: [stack.id, 'roadmap'],
    };
    this.selectedQuestion = fakeQuestion;
    this.aiMessages = [];
    this.streamingText = '';
    this.loadAIExplanation(fakeQuestion);
  }

  markTopicDone(topic: RoadmapTopic, event: Event): void {
    event.stopPropagation();
    topic.done = !topic.done;
    if (this.selectedStack) {
      this.saveRoadmapProgress(this.selectedStack.id);
      // Debounce-sync to backend (avoid one call per rapid click)
      if (this.customAuth.isLoggedIn && this.savedRoadmapId) {
        this.debounceProgressSync();
      }
    }
  }

  get roadmapDoneCount(): number {
    return this.roadmapSections.reduce((acc, s) => acc + s.topics.filter(t => t.done).length, 0);
  }

  get roadmapTotalCount(): number {
    return this.roadmapSections.reduce((acc, s) => acc + s.topics.length, 0);
  }

  get roadmapPercent(): number {
    if (!this.roadmapTotalCount) return 0;
    return Math.round((this.roadmapDoneCount / this.roadmapTotalCount) * 100);
  }

  private saveRoadmapProgress(stackId: string): void {
    const doneIds = this.roadmapSections
      .reduce((acc: string[], s) => acc.concat(s.topics.filter(t => t.done).map(t => t.id)), []);
    localStorage.setItem(`ip_roadmap_${stackId}`, JSON.stringify(doneIds));
  }

  private loadRoadmapProgress(stackId: string): string[] | null {
    const raw = localStorage.getItem(`ip_roadmap_${stackId}`);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }

  /** Whether a generated roadmap is already stored for this stack */
  hasSavedRoadmap(stackId: string): boolean {
    return !!localStorage.getItem(`ip_roadmap_sections_${stackId}`);
  }

  /** Get the saved progress percentage for a stack (null if none) */
  getStackProgress(stackId: string): number | null {
    const structureRaw = localStorage.getItem(`ip_roadmap_sections_${stackId}`);
    if (!structureRaw) return null;
    try {
      const sections: RoadmapSection[] = JSON.parse(structureRaw);
      const progressRaw = localStorage.getItem(`ip_roadmap_${stackId}`);
      const doneIds: string[] = progressRaw ? JSON.parse(progressRaw) : [];
      const total = sections.reduce((acc, s) => acc + s.topics.length, 0);
      if (!total) return null;
      const done = doneIds.length;
      return Math.round((done / total) * 100);
    } catch { return null; }
  }

  private saveRoadmapStructure(stackId: string): void {
    localStorage.setItem(`ip_roadmap_sections_${stackId}`, JSON.stringify(this.roadmapSections));
  }

  private loadRoadmapStructure(stackId: string): RoadmapSection[] | null {
    const raw = localStorage.getItem(`ip_roadmap_sections_${stackId}`);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }

  /** Wipe persisted roadmap and generate a fresh one */
  clearAndRegenerate(): void {
    if (!this.selectedStack) return;
    localStorage.removeItem(`ip_roadmap_sections_${this.selectedStack.id}`);
    this.roadmapSections = [];
    this.generateRoadmap();
  }

  // ── Backend sync ────────────────────────────────────────────────────────

  /** Save the full roadmap to the backend after generation. */
  private autoSaveToBackend(stack: TechStack): void {
    this.roadmapSyncing   = true;
    this.roadmapSyncError = false;
    const payload = {
      techStackId:   stack.id,
      techStackName: stack.name,
      techStackIcon: stack.icon,
      sections: this.roadmapSections.map(sec => ({
        id:       sec.id,
        title:    sec.title,
        emoji:    sec.emoji,
        expanded: sec.expanded,
        topics:   sec.topics.map(t => ({
          id:   t.id,
          text: t.text,
          done: t.done,
          completedAt: null as string | null,
        })),
      })),
    };
    this.roadmapBackend.save(payload).subscribe(dto => {
      this.roadmapSyncing = false;
      if (dto) {
        this.savedRoadmapId = dto.id;
        this.roadmapSynced  = true;
        setTimeout(() => { this.roadmapSynced = false; }, 2500);
      } else {
        this.roadmapSyncError = true;
        setTimeout(() => { this.roadmapSyncError = false; }, 3000);
      }
    });
  }

  /** Debounce progress updates so rapid checkbox clicks → one API call. */
  private debounceProgressSync(): void {
    clearTimeout(this.progressDebounce);
    this.progressDebounce = setTimeout(() => this.syncProgressNow(), 1200);
  }

  private syncProgressNow(): void {
    if (!this.savedRoadmapId || !this.roadmapSections.length) return;
    this.roadmapSyncing = true;
    this.roadmapBackend.updateProgress(this.savedRoadmapId, this.roadmapSections)
      .subscribe(dto => {
        this.roadmapSyncing = false;
        if (dto) {
          this.roadmapSynced = true;
          setTimeout(() => { this.roadmapSynced = false; }, 1800);
        }
      });
  }

  /** Serialise the current roadmap as a markdown note and save to the notes drawer */
  saveRoadmapAsNote(): void {
    // Guest — show sign-in prompt instead of saving
    if (!this.isLoggedIn) { this.showLoginPrompt = true; return; }

    if (!this.selectedStack || !this.roadmapSections.length) return;
    const stack = this.selectedStack;

    let md = `# ${stack.icon} ${stack.name} Interview Prep Roadmap\n\n`;
    md += `**Progress:** ${this.roadmapDoneCount}/${this.roadmapTotalCount} topics (${this.roadmapPercent}%)\n\n`;
    this.roadmapSections.forEach(sec => {
      md += `## ${sec.emoji} ${sec.title}\n`;
      sec.topics.forEach(t => { md += `- [${t.done ? 'x' : ' '}] ${t.text}\n`; });
      md += '\n';
    });

    const noteId = -(TECH_STACKS.findIndex(s => s.id === stack.id) + 100);
    const note: SavedNote = {
      questionId: noteId,
      question:   `${stack.name} Interview Prep Roadmap`,
      category:   'Roadmap',
      answer:     md,
      savedAt:    new Date().toISOString(),
    };
    this.savedNotes = this.savedNotes.filter(n => n.questionId !== noteId);
    this.savedNotes.unshift(note);
    localStorage.setItem('ip_saved_notes', JSON.stringify(this.savedNotes));
    this.roadmapNoteSaved = true;
    setTimeout(() => (this.roadmapNoteSaved = false), 2500);

    // Persist to backend Notes
    this.notesSvc.saveNote(
      `${stack.name} Interview Prep Roadmap`,
      'Other',
      md,
      ['interview-prep', 'roadmap', stack.id],
      'prep',
      stack.id,
    ).catch(() => { /* silently swallow — local save already succeeded */ });
  }

  /** Open the login modal instantly — works even when already on /interview-prep.
   * Uses AuthTriggerService so same-URL navigation is never needed. */
  promptLogin(): void {
    this.showLoginPrompt = false;
    this.authTrigger.requestLogin();
  }

  dismissLoginPrompt(): void { this.showLoginPrompt = false; }

  /**
   * Controlled tab switcher — Roadmap is login-gated.
   * Guests see the lock overlay; after login the tab auto-restores.
   */
  selectTab(tab: 'questions' | 'roadmap'): void {
    if (tab === 'roadmap' && !this.isLoggedIn) {
      this.pendingTab = 'roadmap';   // remember intent for post-login restore
      this.sidebarTab = 'roadmap';   // visually select so lock gate renders
      this.promptLogin();
      return;
    }
    this.sidebarTab = tab;
  }

  /* ─── Filtering ─────────────────────────────────────────── */
  applyFilters(): void {
    let qs = [...this.allQuestions];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      qs = qs.filter(q =>
        q.question.toLowerCase().includes(term) ||
        q.category.toLowerCase().includes(term) ||
        (q.tags || []).some(t => t.toLowerCase().includes(term)),
      );
    }

    if (this.selectedCategory !== 'all') {
      qs = qs.filter(q => q.category === this.selectedCategory);
    }

    if (this.selectedDifficulty !== 'all') {
      qs = qs.filter(q => q.difficulty === this.selectedDifficulty);
    }

    this.filteredQuestions = qs;
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  /* ─── Question selection ────────────────────────────────── */
  selectQuestion(q: InterviewQuestion): void {
    if (this.selectedQuestion?.id === q.id) return;
    this.selectedQuestion = q;
    this.aiMessages = [];
    this.streamingText = '';
    this.followUpText = '';
    this.answerMode = 'normal'; // reset mode for each new question
    this.showMobileSidebar = false; // close drawer on mobile
    this.loadAIExplanation(q);
  }

  closeSidePanel(): void {
    this.selectedQuestion = null;
    this.aiMessages = [];
    this.streamingText = '';
    this.activeTopic = null;
    this.aiSub?.unsubscribe();
  }

  /* ─── AI explanation ────────────────────────────────────── */
  loadAIExplanation(q: InterviewQuestion): void {
    this.isLoadingAI = true;
    this.streamingText = '';

    // Push the question as a "user" message for chat feel
    this.aiMessages.push({
      role: 'user',
      text: q.question,
      timestamp: new Date(),
    });

    const prompt = this.buildInterviewPrompt(q, this.answerMode);

    this.aiSub?.unsubscribe();
    this.aiSub = this.aiLearnService.getOllamaExplanation(prompt).subscribe({
      next: (res: any) => {
        if (res.done) {
          // Final chunk — strip echoed preamble and move to messages
          this.aiMessages.push({
            role: 'ai',
            text: this.cleanResponse(res.explanation),
            timestamp: new Date(),
          });
          this.streamingText = '';
          this.isLoadingAI = false;
          this.scrollToBottom();
        } else {
          // Streaming partial — strip echoed preamble and show in bubble
          this.streamingText = this.cleanResponse(res.explanation);
          this.isLoadingAI = false;
          this.scrollToBottom();
        }
      },
      error: () => {
        this.streamingText = '';
        this.isLoadingAI = false;
        this.aiMessages.push({
          role: 'ai',
          text: '⚠️ Unable to generate AI explanation right now. Please try again in a moment.',
          timestamp: new Date(),
        });
        this.scrollToBottom();
      },
    });
  }

  /** Strip echoed preamble AND the Explore-more block from rendered bubbles.
   * Handles both ## and ### style headings (used by different prompt modes). */
  private cleanResponse(text: string): string {
    if (!text) return text;
    let t = text;

    // Strip echoed prompt preamble only — real content starts right away in the new free-form prompts.
    // Only strip if a heading appears within the first 300 chars (a short echoed opener, not mid-response structure).
    const idx2 = t.indexOf('\n## ');
    const idx3 = t.indexOf('\n### ');
    const headingIdx =
      idx2 !== -1 && idx3 !== -1 ? Math.min(idx2, idx3)
      : idx2 !== -1 ? idx2
      : idx3 !== -1 ? idx3
      : -1;
    if (headingIdx !== -1 && headingIdx < 300) {
      t = t.slice(headingIdx + 1);
    }

    // Strip "**Explore more:**" block — surfaces as suggestedFollowUps chips instead
    t = t
      .replace(/\*{0,2}Explore more[:\*]*\*{0,2}[\s\S]*?(?=\n##|\n###|\n\*\*[A-Z]|\n---+|$)/i, '')
      .replace(/\s+$/, '');

    return t;
  }

  retryExplanation(): void {
    if (!this.selectedQuestion) return;
    this.aiMessages = [];
    this.loadAIExplanation(this.selectedQuestion);
  }

  /** Switch the answer mode and reload the explanation for the current question. */
  setMode(mode: string): void {
    if (this.answerMode === mode) return;
    this.answerMode = mode;
    if (this.selectedQuestion) {
      this.aiMessages = [];
      this.streamingText = '';
      this.loadAIExplanation(this.selectedQuestion);
    }
  }

  /**
   * Builds an adaptive, conversational mentor prompt.
   * Each mode produces genuinely different response styles — never the same rigid skeleton.
   */
  private buildInterviewPrompt(q: InterviewQuestion, mode: string): string {
    const topic   = q.question;
    const cat     = q.category;
    const diff    = q.difficulty || 'Medium';

    // Shared persona & ground rules (kept brief so the model stays on task)
    const SYS =
      `You are a brilliant senior software engineer acting as an interview coach and mentor. ` +
      `You sound like a knowledgeable colleague in a Slack thread — natural, direct, no filler. ` +
      `Never start with "Sure!", "Certainly!", "Great question!" or any similar opener. ` +
      `Topic: "${topic}" | Category: ${cat} | Difficulty: ${diff}\n\n`;

    const EXPLORE =
      `\n\n**Explore more:**\n` +
      `- [most common interviewer follow-up question 1?]\n` +
      `- [most common interviewer follow-up question 2?]\n` +
      `- [a senior-level or edge-case follow-up?]`;

    const prompts: Record<string, string> = {

      normal:
        SYS +
        `Give a complete, interview-ready answer. Think of this as coaching a smart engineer who ` +
        `knows the basics but needs to nail the explanation in an interview setting.\n\n` +
        `- Open directly with the core idea in 1–2 sentences — no headers, no preamble\n` +
        `- Explain how it works naturally, like you're talking through it (mix prose and bullets)\n` +
        `- Include ONE practical code example (10–15 lines) that shows the concept in context\n` +
        `- End with a short "In an interview, the key thing to emphasise is..." note\n` +
        `- Bold key terms inline as they appear\n` +
        `- End the response with: "Want me to go deeper on any part of this?"` +
        EXPLORE,

      simple:
        SYS +
        `The user wants the simplest possible explanation — they're building intuition, not depth yet.\n\n` +
        `- Start with ONE sentence in plain English that captures the whole idea — no jargon\n` +
        `- Immediately follow with a real-world non-tech analogy (not a tech metaphor)\n` +
        `- Then show the concept in code in ≤8 lines — the absolute simplest usage\n` +
        `- Use everyday language throughout; if you must use a technical term, define it on the spot\n` +
        `- Keep it short — understanding first, completeness second\n` +
        `- End with: "Does that click? Want the deeper version when you're ready?"` +
        EXPLORE,

      analogy:
        SYS +
        `Make this concept impossible to forget by building a memorable real-world analogy.\n\n` +
        `- Open with the analogy directly — non-technical (coffee shop, traffic, restaurant, etc.)\n` +
        `- Spend 3–4 sentences building the analogy richly; make it visual and concrete\n` +
        `- Then explicitly map each part of the analogy back to the technical concept\n` +
        `- Show a short code snippet (≤10 lines) that proves the analogy holds in practice\n` +
        `- End with: "Does that mental model make it stick? Want a different angle?"` +
        EXPLORE,

      code:
        SYS +
        `Lead with code — the user learns best by seeing it in action.\n\n` +
        `- Start with 1 sentence of context, then immediately show a realistic, self-contained ` +
        `code example (15–25 lines). Every non-obvious line gets an inline comment.\n` +
        `- After the code: explain in 2–3 short paragraphs what the code demonstrates and why it's ` +
        `written that way — no rigid headers, just natural prose\n` +
        `- Highlight 1–2 things a reviewer would instantly notice (good or bad) in this code\n` +
        `- End with: "Want to see how this changes in a real-world scenario or edge case?"` +
        EXPLORE,

      mistakes:
        SYS +
        `Teach through failure — the most memorable learning comes from understanding what goes wrong.\n\n` +
        `- Cover the 3 most common mistakes developers make with this in interviews and production\n` +
        `- For each mistake: show broken/naive code (4–8 lines) → fixed code (4–8 lines), with inline ` +
        `comments explaining WHY the first version is wrong\n` +
        `- After each fix, give ONE memorable rule: "The rule here: ..."\n` +
        `- Conversational tone — "the sneaky thing here is...", "this trips up even experienced devs..."\n` +
        `- End with the single most dangerous misconception about this topic and: ` +
        `"Any of these look familiar from your codebase?"` +
        EXPLORE,

      best_practices:
        SYS +
        `Share the production-grade wisdom that separates junior answers from senior answers.\n\n` +
        `- Cover 3–4 real best practices — NOT a generic bullet dump\n` +
        `- For each: what beginners do, what seniors do, and WHY it matters in production\n` +
        `- Include code snippets only where they make a concrete difference (side-by-side if helpful)\n` +
        `- Mention trade-offs: when is the "best practice" NOT the right choice?\n` +
        `- End with: "In an interview, saying X signals you've shipped this in production — ` +
        `want me to prep you on the likely follow-up questions?"` +
        EXPLORE,

      interview_tips:
        SYS +
        `Give focused interview coaching — not a general explanation. The user already understands ` +
        `the concept; they need to know how to deliver it under pressure.\n\n` +
        `- The opening line: what's the perfect first sentence to say in an interview for this question?\n` +
        `- Signal words: 2–3 keywords or phrases that immediately tell the interviewer you know this deep\n` +
        `- The trap: one thing candidates say that tanks an otherwise good answer — and how to avoid it\n` +
        `- Wrapping up: how to end your answer to invite a deep-dive (not just trail off)\n` +
        `- BRIEF delivery guide: if 2 minutes, cover X. If 5 minutes, add Y, Z.\n` +
        `- End with: "Want me to mock-interview you on this one?"` +
        EXPLORE,
    };

    return prompts[mode] ?? prompts['normal'];
  }

  /* ─── Follow-up ─────────────────────────────────────────── */

  /**
   * Internal: push user message and fire AI call with a separate send-prompt.
   * displayText is what renders in the chat bubble; sendPrompt is what goes to the LLM.
   */
  private _sendFollowUpWithContext(displayText: string, sendPrompt: string): void {
    if (this.isFollowUpLoading) return;
    this.aiMessages.push({
      role: 'user',
      text: displayText,
      ...(displayText !== sendPrompt ? { _sendContent: sendPrompt } : {}),
      timestamp: new Date(),
    });
    this.followUpText = '';
    this.isFollowUpLoading = true;

    this.aiSub?.unsubscribe();
    this.aiSub = this.aiLearnService.getOllamaExplanation(sendPrompt).subscribe({
      next: (res: any) => {
        if (res.done) {
          const cleaned = this.cleanResponse(res.explanation);
          this.aiMessages.push({ role: 'ai', text: cleaned, timestamp: new Date() });
          this.streamingText = '';
          this.isFollowUpLoading = false;
          this.scrollToBottom();
        } else {
          this.streamingText = this.cleanResponse(res.explanation);
          this.isFollowUpLoading = false;
          this.scrollToBottom();
        }
      },
      error: () => {
        this.streamingText = '';
        this.isFollowUpLoading = false;
        this.aiMessages.push({ role: 'ai', text: '⚠️ Could not get an answer. Try again.', timestamp: new Date() });
        this.scrollToBottom();
      },
    });
  }

  sendFollowUp(): void {
    const text = this.followUpText.trim();
    if (!text || this.isFollowUpLoading || !this.selectedQuestion) return;

    const q = this.selectedQuestion;
    const lastAI = [...this.aiMessages].reverse().find(m => m.role === 'ai')?.text?.slice(0, 800) ?? '';
    const intent = this.detectIntent(text);

    // Build conversation history (last 6 messages)
    const historyLines = this.aiMessages
      .slice(-6)
      .map(m => {
        const content = m._sendContent ?? m.text;
        return `${m.role === 'user' ? 'Candidate' : 'Coach'}: ${content.slice(0, 500)}`;
      })
      .join('\n\n');

    const SYS =
      `You are a senior technical interview coach. Natural tone — like a mentor in a Slack thread.\n` +
      `Never start with filler. Don't repeat what was already covered.\n\n`;
    const topicCtx = `Interview topic: "${q.question}" (${q.category})\n\n`;
    const EXPLORE =
      `\n\nAfter your response add EXACTLY:\n` +
      `**Explore more:**\n- [follow-up question 1?]\n- [follow-up question 2?]`;

    let context: string;

    if (intent === 'confused') {
      context =
        SYS + topicCtx +
        `The candidate is confused. They said: "${text}"\n\n` +
        `What was just explained:\n${lastAI}\n\n` +
        `Re-explain from scratch using a completely different angle:\n` +
        `1. ONE ultra-simple sentence capturing the whole idea\n` +
        `2. A real-world non-tech analogy\n` +
        `3. ONE tiny code example (≤8 lines), simplest possible usage\n` +
        `4. Close with: "Does that make more sense? What part is still fuzzy?"\n` +
        `Short paragraphs. Zero jargon unless defined.` + EXPLORE;
    } else if (intent === 'why') {
      context =
        SYS + topicCtx +
        `Conversation so far:\n${historyLines}\n\n` +
        `Candidate asks: "${text}"\n\n` +
        `Focus on the WHY — the problem this solves, when engineers actually need it. ` +
        `Concrete before/after scenario. 2-3 short paragraphs. No rigid headers.` + EXPLORE;
    } else if (intent === 'how') {
      context =
        SYS + topicCtx +
        `Conversation so far:\n${historyLines}\n\n` +
        `Candidate asks: "${text}"\n\n` +
        `Walk through HOW step by step — conversational prose, not a numbered list unless steps are genuinely sequential. ` +
        `Mix explanation + code naturally. ≤20 lines of code max.` + EXPLORE;
    } else if (intent === 'example') {
      context =
        SYS + topicCtx +
        `Conversation so far:\n${historyLines}\n\n` +
        `Candidate wants an example for: "${text}"\n\n` +
        `ONE realistic, self-contained code example (15-20 lines). ` +
        `Introduce in 1-2 sentences. Inline comments on non-obvious lines. ` +
        `After the code: 2-3 sentences on what to notice. No rigid headers.` + EXPLORE;
    } else {
      context =
        SYS + topicCtx +
        `Conversation so far:\n${historyLines}\n\n` +
        `Candidate asks: "${text}"\n\n` +
        `Answer naturally — continuing the conversation, not starting a new lesson. ` +
        `Match length to the question. Bold key terms. Wrap code in fenced blocks.` + EXPLORE;
    }

    this._sendFollowUpWithContext(text, context);
  }

  onFollowUpKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendFollowUp();
    }
  }

  /* ─── Helpers ───────────────────────────────────────────── */
  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.msgContainer) {
        this.msgContainer.nativeElement.scrollTop =
          this.msgContainer.nativeElement.scrollHeight;
      }
    }, 80);
  }

  difficultyClass(diff?: string): string {
    switch (diff) {
      case 'Easy':   return 'badge-easy';
      case 'Medium': return 'badge-medium';
      case 'Hard':   return 'badge-hard';
      default:       return 'badge-medium';
    }
  }

  trackById(_: number, q: InterviewQuestion): number {
    return q.id;
  }

  /* ─── Notes ─────────────────────────────────────────────── */
  isNoteSaved(): boolean {
    return !!this.selectedQuestion &&
      this.savedNotes.some(n => n.questionId === this.selectedQuestion!.id);
  }

  saveCurrentNote(): void {
    // Guest — show sign-in prompt instead of saving
    if (!this.isLoggedIn) { this.showLoginPrompt = true; return; }

    if (!this.selectedQuestion) return;
    const aiTexts = this.aiMessages.filter(m => m.role === 'ai').map(m => m.text);
    const answer = aiTexts.join('\n\n') || this.streamingText;
    if (!answer.trim()) return;

    const note: SavedNote = {
      questionId: this.selectedQuestion.id,
      question:   this.selectedQuestion.question,
      category:   this.selectedQuestion.category,
      difficulty: this.selectedQuestion.difficulty,
      answer,
      savedAt:    new Date().toISOString(),
    };
    // Replace if already saved
    this.savedNotes = this.savedNotes.filter(n => n.questionId !== this.selectedQuestion!.id);
    this.savedNotes.unshift(note);
    localStorage.setItem('ip_saved_notes', JSON.stringify(this.savedNotes));
    this.noteSaved = true;
    setTimeout(() => (this.noteSaved = false), 2200);

    // Persist to backend Notes
    const tags: string[] = ['interview-prep'];
    if (this.selectedQuestion.difficulty) tags.push(this.selectedQuestion.difficulty.toLowerCase());
    this.notesSvc.saveNote(
      this.selectedQuestion.question,
      this.selectedQuestion.category,
      answer,
      tags,
      'prep',
      String(this.selectedQuestion.id),
    ).catch(() => { /* silently swallow — local save already succeeded */ });
  }

  deleteNote(questionId: number): void {
    this.savedNotes = this.savedNotes.filter(n => n.questionId !== questionId);
    localStorage.setItem('ip_saved_notes', JSON.stringify(this.savedNotes));
  }

  openNoteQuestion(note: SavedNote): void {
    const q = this.allQuestions.find(q => q.id === note.questionId);
    if (q) { this.selectQuestion(q); this.showNotesDrawer = false; }
  }

  toggleNotesDrawer(): void {
    this.showNotesDrawer = !this.showNotesDrawer;
  }

  /** Copy an AI message text to clipboard */
  copyMessage(text: string): void {
    navigator.clipboard.writeText(text).catch(() => {
      // fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
  }

  /* ─────────────────────────────────────────────────────────────────────────
     TOOLS PANEL METHODS
     ───────────────────────────────────────────────────────────────────────── */

  /** Get related questions based on current question's category */
  getRelatedQuestions(): InterviewQuestion[] {
    if (!this.selectedQuestion) return [];
    
    return this.filteredQuestions
      .filter(q => 
        q.id !== this.selectedQuestion!.id && 
        q.category === this.selectedQuestion!.category
      )
      .slice(0, 8); // Return up to 8 related questions
  }

  /** Quick action: Explain in simpler terms — re-explains the last response from scratch */
  explainSimpler(): void {
    if (!this.selectedQuestion || this.isLoadingAI || this.isFollowUpLoading) return;
    const lastAI = [...this.aiMessages].reverse().find(m => m.role === 'ai')?.text?.slice(0, 1000) ?? '';
    const q = this.selectedQuestion;
    const prompt =
      `You are a senior technical interview coach. Natural tone — like a patient mentor.\n` +
      `The candidate didn't fully get the explanation. Re-explain from scratch using a completely different angle.\n\n` +
      `Topic: "${q.question}" (${q.category})\n\n` +
      (lastAI ? `What was just explained:\n${lastAI}\n\n` : '') +
      `Your re-explanation must:\n` +
      `- Open with ONE sentence that captures the whole idea in plain English\n` +
      `- Use a real-world non-tech analogy (coffee shop, restaurant, traffic light — anything relatable)\n` +
      `- ONE tiny code example (≤8 lines) showing the simplest possible usage\n` +
      `- Close with: "Does that click? What part is still fuzzy?"\n` +
      `Short paragraphs (2-3 sentences max). Zero jargon unless you define it.\n\n` +
      `After your response add EXACTLY:\n**Explore more:**\n- [follow-up question 1?]\n- [follow-up question 2?]`;
    this._sendFollowUpWithContext('💡 Explain simpler', prompt);
  }

  /** Quick action: Give analogy — converts last explanation into a memorable real-world story */
  giveAnalogy(): void {
    if (!this.selectedQuestion || this.isLoadingAI || this.isFollowUpLoading) return;
    const lastAI = [...this.aiMessages].reverse().find(m => m.role === 'ai')?.text?.slice(0, 1000) ?? '';
    const q = this.selectedQuestion;
    const prompt =
      `You are a senior technical interview coach.\n` +
      `Topic: "${q.question}" (${q.category})\n\n` +
      (lastAI ? `What was just explained:\n${lastAI}\n\n` : '') +
      `Create ONE memorable real-world analogy that makes this concept impossible to forget.\n` +
      `- The analogy should be non-technical (avoid tech metaphors)\n` +
      `- Explain the analogy in 2-3 sentences\n` +
      `- Map each part of the analogy back to the technical concept explicitly\n` +
      `- Then give a tiny code snippet (≤8 lines) that proves the analogy holds\n` +
      `- End with: "Does that mental model help?"\n\n` +
      `After your response add EXACTLY:\n**Explore more:**\n- [follow-up question 1?]\n- [follow-up question 2?]`;
    this._sendFollowUpWithContext('🎠 Give me an analogy', prompt);
  }

  /** Quick action: Show code example */
  showCode(): void {
    if (!this.selectedQuestion || this.isLoadingAI || this.isFollowUpLoading) return;
    this.sendChipAction('code-example');
  }

  /** Quick action: Common mistakes */
  commonMistakes(): void {
    if (!this.selectedQuestion || this.isLoadingAI || this.isFollowUpLoading) return;
    this.sendChipAction('common-mistakes');
  }

  /** Get expert interview tips — contextual coaching based on last explanation */
  getInterviewTips(): void {
    if (!this.selectedQuestion || this.isLoadingAI || this.isFollowUpLoading) return;
    const lastAI = [...this.aiMessages].reverse().find(m => m.role === 'ai')?.text?.slice(0, 800) ?? '';
    const q = this.selectedQuestion;
    const prompt =
      `You are a brilliant technical interview coach helping a candidate nail their interviews.\n` +
      `Never start with filler. Build on what was already explained.\n\n` +
      `Interview topic: "${q.question}" (${q.category})\n\n` +
      (lastAI ? `What was just covered:\n${lastAI}\n\n` : '') +
      `Give interview-specific coaching for this exact topic:\n` +
      `- How to START the answer (the opening line that makes an interviewer nod)\n` +
      `- What keywords/concepts to mention to signal senior knowledge\n` +
      `- One common mistake candidates make when answering this — and how to avoid it\n` +
      `- How to end the answer to invite follow-up (not just trail off)\n` +
      `Conversational tone. 3-4 short paragraphs. No rigid header sections.\n\n` +
      `After your response add EXACTLY:\n**Explore more:**\n- [follow-up question 1?]\n- [follow-up question 2?]`;
    this._sendFollowUpWithContext('🎯 Interview tips', prompt);
  }

  /** Expose Math for template */
  Math = Math;
}
