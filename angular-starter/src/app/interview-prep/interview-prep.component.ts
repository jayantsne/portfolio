import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { QuestionsDataService, InterviewQuestion } from '../shared/questions-data.service';
import { AILearnService } from '../services/ai-learn.service';

interface AIMessage {
  role: 'user' | 'ai';
  text: string;
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

  /* ─── Roadmap state ──────────────────────────────────────── */
  readonly techStacks = TECH_STACKS;
  selectedStack: TechStack | null = null;
  roadmapSections: RoadmapSection[] = [];
  isGeneratingRoadmap = false;
  roadmapError = '';
  roadmapProgress = 0;           // 0-100 for the generation progress bar
  activeTopic: string | null = null;  // which topic is being explained in chat
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

  /** Extract follow-up questions from the last AI message (## Common Follow-up Questions section) */
  get suggestedFollowUps(): string[] {
    const lastAi = [...this.aiMessages].reverse().find(m => m.role === 'ai');
    if (!lastAi) return [];
    const match = lastAi.text.match(/##\s*Common Follow-up Questions[\s\S]*?\n(([\s\S]*?)(?=\n##|$))/);
    if (!match) return [];
    return match[1]
      .split('\n')
      .map(l => l.replace(/^\s*[-*\d.]+\s*/, '').trim())
      .filter(l => l.length > 10 && l.length < 160 && !l.startsWith('#'))
      .slice(0, 3);
  }

  sendSuggestedFollowUp(text: string): void {
    this.followUpText = text;
    this.sendFollowUp();
  }

  @ViewChild('msgContainer') msgContainer!: ElementRef;

  private sub!: Subscription;
  private aiSub?: Subscription;

  constructor(
    private questionsData: QuestionsDataService,
    private aiLearnService: AILearnService,
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
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.aiSub?.unsubscribe();
    this.roadmapSub?.unsubscribe();
    clearInterval(this.progressTimer);
  }

  /* ─── Roadmap ─────────────────────────────────────────────── */
  selectStack(stack: TechStack): void {
    if (this.selectedStack?.id === stack.id) return;
    this.selectedStack = stack;
    this.roadmapSections = [];
    this.roadmapError = '';
    this.activeTopic = null;
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

    const prompt = `You are an expert software engineer and technical interviewer helping a candidate prepare for job interviews.

QUESTION: "${q.question}"
Category: ${q.category} | Difficulty: ${q.difficulty || 'Medium'}

Please provide a comprehensive answer structured as follows:

## Core Answer
A clear, concise, structured answer (2-4 sentences to open, then depth).

## Key Concepts to Mention
- Bullet list of the most important terms / concepts the interviewer expects you to cover

## Code Example
\`\`\`
// Provide a short, relevant code snippet if applicable
\`\`\`

## Common Follow-up Questions
The 2-3 most common follow-up questions interviewers ask on this topic.

## Pro Tips
What separates a good answer from a great answer — real-world insights or senior-level nuance.

Keep your answer focused and interview-ready. Avoid generic filler.`;

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

  /** Strip any echoed prompt/preamble — real answer begins at the first ## heading */
  private cleanResponse(text: string): string {
    const idx = text.indexOf('\n## ');
    if (idx !== -1 && idx < 1200) {
      return text.slice(idx + 1);
    }
    return text;
  }

  retryExplanation(): void {
    if (!this.selectedQuestion) return;
    this.aiMessages = [];
    this.loadAIExplanation(this.selectedQuestion);
  }

  /* ─── Follow-up ─────────────────────────────────────────── */
  sendFollowUp(): void {
    const text = this.followUpText.trim();
    if (!text || this.isFollowUpLoading || !this.selectedQuestion) return;

    this.aiMessages.push({ role: 'user', text, timestamp: new Date() });
    this.followUpText = '';
    this.isFollowUpLoading = true;

    const context = `The candidate is practicing interview questions. The current question is: "${this.selectedQuestion.question}" (${this.selectedQuestion.category}).

The candidate asks a follow-up: "${text}"

Please answer concisely and with interview-prep focus.`;

    this.aiSub = this.aiLearnService.getOllamaExplanation(context).subscribe({
      next: (res: any) => {
        if (res.done) {
          this.aiMessages.push({
            role: 'ai',
            text: res.explanation,
            timestamp: new Date(),
          });
          this.streamingText = '';
          this.isFollowUpLoading = false;
          this.scrollToBottom();
        } else {
          this.streamingText = res.explanation;
          this.isFollowUpLoading = false;
          this.scrollToBottom();
        }
      },
      error: () => {
        this.streamingText = '';
        this.isFollowUpLoading = false;
        this.aiMessages.push({
          role: 'ai',
          text: '⚠️ Could not get an answer. Try again.',
          timestamp: new Date(),
        });
        this.scrollToBottom();
      },
    });
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
}
