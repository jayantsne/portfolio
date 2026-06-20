import {
  Component, OnInit, OnDestroy, ChangeDetectorRef,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { StructuredNoteDto } from '../shared/structured-note/structured-note.component';
import { CustomAuthService } from '../shared/custom-auth.service';
import { NotesService } from '../shared/notes.service';
import { AILearnService } from '../services/ai-learn.service';
import { PlaygroundService } from '../services/playground.service';
import {
  LwTopic, LwSection, LwMessage, LwNote,
} from '../shared/learning-workspace/learning-workspace.models';
import {
  SK_MODULES, SK_LAB_CODE, SK_DEFAULT_CODE, SK_MENTOR_CHIPS, SK_STATIC_CONTENT,
} from './semantic-kernel-data';

const PROGRESS_KEY = 'sk_progress';

@Component({
  selector: 'app-semantic-kernel-learn',
  templateUrl: './semantic-kernel.component.html',
  styleUrls: ['./semantic-kernel.component.css'],
})
export class SemanticKernelLearnComponent implements OnInit, OnDestroy {

  // ── Module data ────────────────────────────────────────────────────────
  readonly skModules = SK_MODULES;
  readonly mentorChips = SK_MENTOR_CHIPS;

  // ── Progress ───────────────────────────────────────────────────────────
  completedTopics: Set<string> = new Set();

  // ── Lesson panel state ─────────────────────────────────────────────────
  activeTopicId: string = 'sk-intro-1';
  lessonLoading    = false;
  lessonError      = false;
  lessonFollowUpLoading = false;
  lessonMessages: { role: 'user' | 'ai'; text: string }[] = [];
  lessonStreamingText = '';
  lessonIsStreaming    = false;
  private lessonSub:  Subscription | null = null;

  // ── Panel collapse ─────────────────────────────────────────────────────
  leftPanelCollapsed  = false;
  rightPanelCollapsed = false;
  mentorPanelTab: 'mentor' | 'notes' = 'mentor';

  // ── Playground panel ───────────────────────────────────────────────────
  pgCode      = SK_DEFAULT_CODE;
  pgLoadToken = 0;
  pgOutput: any = '';
  pgLoading   = false;
  pgError     = '';
  pgMs        = 0;
  private pgSub: Subscription | null = null;

  // ── Structured note state ────────────────────────────────────
  structuredNote:    StructuredNoteDto | null = null;
  structuredLoading  = false;
  structuredError    = false;

  // ── Mode & response cache ────────────────────────────────────
  /** Currently active view mode — drives mode-specific AI question variants */
  activeMode = 'default';
  /** Cache keyed by `topicId:mode`. Serves instant responses on revisit. */
  private responseCache = new Map<string, string>();

  // ── AI fallback flag ─────────────────────────────────────────────
  /** True when showing curriculum content because AI is unavailable */
  lessonIsAiFallback = false;

  // ── First-visit hint ─────────────────────────────────────────────
  showFirstVisitHint = localStorage.getItem('sk_hint_dismissed') !== 'true';

  // ── Inline notes ───────────────────────────────────────────────────────
  inlineNotes: { topic: string; text: string }[] = [];

  // ── Toast ──────────────────────────────────────────────────────────────
  toast: { msg: string; type: 'success' | 'error' | 'info' } | null = null;
  private toastTimer: any;

  constructor(
    public  auth:      CustomAuthService,
    private aiSvc:     AILearnService,
    private notesSvc:  NotesService,
    private sanitizer: DomSanitizer,
    private cdr:       ChangeDetectorRef,
    private pg:        PlaygroundService,
    private http:      HttpClient,
  ) {}

  ngOnInit(): void {
    this.loadProgress();
    // Auto-load the first active topic lesson
    this.loadLesson(this.activeTopicId);
    // Intercept appTryNow clicks: use the embedded playground panel instead of
    // navigating away to /playground.
    this.pg.setTryNowOverride((code, _lang) => {
      this.handleTryNow(code);
      return true;
    });
  }

  ngOnDestroy(): void {
    this.lessonSub?.unsubscribe();
    this.pgSub?.unsubscribe();
    clearTimeout(this.toastTimer);
    this.pg.setTryNowOverride(null);
  }

  // ── Progress helpers ────────────────────────────────────────────────────

  private loadProgress(): void {
    try {
      const saved = localStorage.getItem(PROGRESS_KEY);
      if (saved) {
        const arr: string[] = JSON.parse(saved);
        this.completedTopics = new Set(arr);
        this.syncTopicStatuses();
      }
    } catch { /* ignore */ }
  }

  private saveProgress(): void {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify([...this.completedTopics]));
    } catch { /* ignore */ }
  }

  /**
   * After loading progress, update topic status objects so the sidebar
   * renders correct badges (completed / active / locked).
   */
  private syncTopicStatuses(): void {
    let foundFirst = false;
    for (const mod of this.skModules) {
      for (const topic of mod.topics) {
        if (this.completedTopics.has(topic.id)) {
          topic.status = 'completed';
        } else if (!foundFirst) {
          topic.status = 'active';
          foundFirst = true;
        } else {
          topic.status = 'locked';
        }
      }
    }
  }

  get allTopics(): LwTopic[] {
    return ([] as LwTopic[]).concat(...this.skModules.map((m: any) => m.topics as LwTopic[]));
  }

  get activeTopic(): LwTopic | null {
    return this.allTopics.find(t => t.id === this.activeTopicId) ?? null;
  }

  get overallProgress(): number {
    const total = this.allTopics.length;
    return total === 0 ? 0 : Math.round((this.completedTopics.size / total) * 100);
  }

  // ── LwWorkspace adapters ────────────────────────────────────────────────

  /** Flatten all topics for the sidebar — no LwModule grouping needed */
  get lwTopics(): LwTopic[] {
    return this.allTopics;
  }

  /** Lesson content: wrap first AI message as a concept section */
  get lwSections(): LwSection[] {
    const text = this.lessonMessages[0]?.text;
    if (!text) return [];
    return [{ type: 'concept', title: 'AI Explanation', icon: '&#128214;', content: text }];
  }

  /** Follow-up thread (index 1+) for the lesson panel Q&A strip */
  get lwFollowUpMessages(): LwMessage[] {
    return this.lessonMessages.slice(1).map(m => ({
      role: m.role as 'user' | 'ai',
      text: m.text,
    }));
  }

  /** Mentor panel messages */
  get lwMentorMessages(): LwMessage[] {
    return this.lwFollowUpMessages;
  }

  get lwNotes(): LwNote[] {
    return this.inlineNotes.map(n => ({
      topicTitle: n.topic,
      text: n.text,
      createdAt: new Date(),
    }));
  }

  get lwHasPrev(): boolean {
    const idx = this.allTopics.findIndex(t => t.id === this.activeTopicId);
    return idx > 0;
  }

  get lwHasNext(): boolean {
    const idx = this.allTopics.findIndex(t => t.id === this.activeTopicId);
    return idx >= 0 && idx < this.allTopics.length - 1;
  }

  // ── Lab topic helpers ───────────────────────────────────────────────────

  get isLabTopic(): boolean {
    return this.activeTopicId?.startsWith('sk-lab-') ?? false;
  }

  get pgLanguage(): string {
    return 'csharp';
  }

  /** Extract code blocks from the rendered lesson HTML for the playground chips */
  get pgLessonCodeBlocks(): string[] {
    const html = this.lessonMessages[0]?.text ?? '';
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

  get pgOutputSafe() {
    return this.pgOutput
      ? this.sanitizer.bypassSecurityTrustHtml(this.pgOutput)
      : '';
  }

  // ── Topic navigation ────────────────────────────────────────────────────

  onLwTopicSelect(topic: LwTopic): void {
    if (topic.id === this.activeTopicId) return;
    this.activeTopicId = topic.id;
    this.lessonMessages = [];
    this.lessonError    = false;
    this.activeMode     = 'default';

    // Pre-load lab starter code when a lab topic is selected
    if (topic.id.startsWith('sk-lab-')) {
      this.pgCode      = SK_LAB_CODE[topic.id] ?? SK_DEFAULT_CODE;
      this.pgLoadToken++;
      this.resetPg();
    }

    this.loadLesson(topic.id);
    this.cdr.markForCheck();
  }

  prevTopic(): void {
    const idx = this.allTopics.findIndex(t => t.id === this.activeTopicId);
    if (idx > 0) this.onLwTopicSelect(this.allTopics[idx - 1]);
  }

  nextTopic(): void {
    const idx = this.allTopics.findIndex(t => t.id === this.activeTopicId);
    if (idx >= 0 && idx < this.allTopics.length - 1) {
      this.onLwTopicSelect(this.allTopics[idx + 1]);
    }
  }

  markComplete(): void {
    const topicId = this.activeTopicId;
    if (!topicId || this.completedTopics.has(topicId)) return;

    this.completedTopics.add(topicId);

    // Update status on the actual topic objects
    const topic = this.allTopics.find(t => t.id === topicId);
    if (topic) topic.status = 'completed';

    // Unlock the next topic
    const idx = this.allTopics.findIndex(t => t.id === topicId);
    if (idx >= 0 && idx < this.allTopics.length - 1) {
      const next = this.allTopics[idx + 1];
      if (next.status === 'locked') next.status = 'active';
    }

    this.saveProgress();
    this.showToast('Topic marked as complete! 🎉', 'success');
    this.cdr.markForCheck();
  }

  // ── Lesson loading ──────────────────────────────────────────────────────

  private loadStructuredLesson(topicId: string, topic: LwTopic): void {
    const cacheKey = `${topicId}:structured`;
    const cached = this.responseCache.get(cacheKey);
    if (cached) {
      this.structuredNote    = JSON.parse(cached) as StructuredNoteDto;
      this.structuredLoading = false;
      this.structuredError   = false;
      this.cdr.markForCheck();
      return;
    }
    this.structuredLoading = true;
    this.structuredNote    = null;
    this.structuredError   = false;
    this.cdr.markForCheck();

    const apiBase = window.location.hostname === 'localhost' ? '' : 'https://learnwithai.tech';
    this.http.post<StructuredNoteDto>(`${apiBase}/api/ai/structured`,
      { topic: topic.title, maxTokens: 2000 })
      .subscribe({
        next: note => {
          this.structuredNote    = note;
          this.structuredLoading = false;
          this.responseCache.set(cacheKey, JSON.stringify(note));
          this.cdr.markForCheck();
        },
        error: () => {
          this.structuredLoading = false;
          this.structuredError   = true;
          this.cdr.markForCheck();
        },
      });
  }

  loadLesson(topicId: string, mode = 'default'): void {
    const topic = this.allTopics.find(t => t.id === topicId);
    if (!topic) return;

    if (mode === 'structured') {
      this.loadStructuredLesson(topicId, topic);
      return;
    }

    // Serve from cache instantly — no API call needed
    const cacheKey = `${topicId}:${mode}`;
    const cached = this.responseCache.get(cacheKey);
    if (cached) {
      this.lessonMessages      = [{ role: 'ai', text: cached }];
      this.lessonLoading       = false;
      this.lessonError         = false;
      this.lessonIsAiFallback  = false;
      this.lessonStreamingText = '';
      this.lessonIsStreaming   = false;
      this.cdr.markForCheck();
      return;
    }

    if (this.lessonSub) {
      this.lessonSub.unsubscribe();
    }

    this.lessonLoading       = true;
    this.lessonError         = false;
    this.lessonIsAiFallback  = false;
    this.lessonMessages      = [];
    this.lessonStreamingText = '';
    this.lessonIsStreaming   = false;
    this.cdr.markForCheck();

    const question = this.buildModeQuestion(topic, mode);

    // Use streaming (SSE) so responses appear token-by-token like ChatGPT
    this.lessonSub = this.aiSvc.getOllamaExplanation(question, mode).subscribe({
      next: (res: any) => {
        if (res.done === false) {
          // First token arrives — switch from spinner to live streaming view
          if (this.lessonLoading) {
            this.lessonLoading    = false;
            this.lessonIsStreaming = true;
          }
          this.lessonStreamingText = res.explanation;
          this.cdr.markForCheck();
        } else {
          // Final token (done: true) — commit to messages and clear stream state
          this.lessonIsStreaming   = false;
          this.lessonLoading       = false;
          if (res.success && res.explanation?.trim()) {
            this.lessonStreamingText = '';
            this.lessonMessages      = [{ role: 'ai', text: res.explanation }];
            this.lessonError         = false;
            this.lessonIsAiFallback  = false;
            this.responseCache.set(cacheKey, res.explanation);
          } else {
            this.lessonStreamingText = '';
            this.showStaticOrError(topicId);
          }
          this.cdr.markForCheck();
        }
      },
      error: (err: any) => {
        console.error('SK lesson load error:', err);
        this.lessonIsStreaming   = false;
        this.lessonStreamingText = '';
        this.showStaticOrError(topicId);
        this.lessonLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private showStaticOrError(topicId: string): void {
    const staticContent = SK_STATIC_CONTENT[topicId];
    if (staticContent) {
      const notice =
        `> 📚 **Curriculum content** — AI Mentor is temporarily unavailable. ` +
        `Click **Retry** for a live AI explanation, or use the **Quick Actions \u2192**\n\n---\n\n`;
      this.lessonMessages     = [{ role: 'ai', text: notice + staticContent }];
      this.lessonError        = false;
      this.lessonIsAiFallback = true;
    } else {
      this.lessonError = true;
    }
  }

  private buildModeQuestion(topic: LwTopic, mode: string): string {
    const title = topic.title;
    const desc  = topic.description ?? '';

    // Expert mentor persona embedded in every prompt.
    // For Ollama (rawMode=true) this IS the full prompt.
    // For OpenAI it combines with the server-side system role.
    const persona = `You are a senior C# and .NET engineer with deep Semantic Kernel expertise.
You ONLY write C# code examples. Never mention jQuery, React, Python, or any framework unrelated to the question.
Never start with filler phrases ("Sure!", "Certainly!", "Of course!", "Great question!").
Every code block must be syntactically valid, runnable C# — no pseudocode, no ellipsis placeholders.
Your response must be unique to THIS topic. Do not reuse section names or structure you used for other SK topics.

`;

    switch (mode) {
      // ── Explicit modes: each has a fixed, narrow purpose ────────────────

      case 'simple':
        return `${persona}Your task: Explain **${title}** to a developer who has never worked with AI frameworks.
${desc ? `Topic context: ${desc}\n` : ''}
Do NOT use any of these as headers: "What Is It?", "Key Concepts", "How It Works".
Pick your own natural language headings that fit THIS specific topic.

Required sections (rename them creatively):
1. The real problem it solves (one sentence of context before you explain anything)
2. The concept in plain English (2–3 sentences, no jargon)
3. One memorable everyday analogy (not a software analogy)
4. The simplest possible code example
\`\`\`csharp
// fewest lines that show the idea working
\`\`\`
5. Three things to remember (bullets)`;

      case 'analogy':
        return `${persona}Your task: Explain **${title}** using exactly 3 real-world analogies from completely different domains.
${desc ? `Topic context: ${desc}\n` : ''}
For each analogy:
## Analogy [N]: [Descriptive Title]
2–3 sentences describing the real-world scenario.
"In Semantic Kernel terms, this maps to..." (one sentence connecting it to the code concept).

End with:
## Why These Analogies Stick
One paragraph explaining why these comparisons make the concept memorable.`;

      case 'deep':
        return `${persona}Your task: Show practical, runnable C# examples for **${title}** in Semantic Kernel.
${desc ? `Topic context: ${desc}\n` : ''}
## Quick Recap
1–2 sentences — what is this and why does it exist in SK?

## Minimal Example
\`\`\`csharp
// Fewest lines to get it working — comment every non-obvious line
\`\`\`

## Production-Style Example
\`\`\`csharp
// How you'd actually use this in a real application — realistic class names, DI, error handling
\`\`\`

## Key Notes
- ✅ What this demonstrates
- ⚠️ The pitfall most developers hit on first attempt
- 💡 The one best practice that matters most`;

      case 'interview':
        return `${persona}Your task: Give a realistic senior-engineer interview Q&A about **${title}** in Semantic Kernel.
${desc ? `Topic context: ${desc}\n` : ''}
## Interview Question
Word it exactly as a senior technical interviewer at a .NET-focused company would ask it.

## Model Answer
Maximum 3 short paragraphs. Start with a precise definition, then mechanics, then practical implication. Use **bold** for key terms.

## The Harder Follow-up
The question they ask if you answer the first one well.

## Ideal Follow-up Answer
Concise, demonstrates depth.

## What Is Being Tested
One paragraph: the underlying knowledge or skill this question is probing for.`;

      case 'mistakes':
        return `${persona}Your task: List the 3 most common mistakes developers make with **${title}** in Semantic Kernel.
${desc ? `Topic context: ${desc}\n` : ''}
For each mistake use this exact format:

## ❌ Mistake [N]: [Descriptive Name — 3–5 words]
**What developers do wrong:**
\`\`\`csharp
// Show the incorrect code pattern — annotate what specifically is wrong
\`\`\`
**Why it's wrong:** One precise sentence.
**✅ The Fix:**
\`\`\`csharp
// Correct code — annotate the key change
\`\`\`

End with:
## 💡 Rule of Thumb
One sentence that prevents all 3 mistakes at once.`;

      case 'exam':
        return `${persona}Your task: Give the best exam / interview-prep notes for **${title}** in Semantic Kernel.
${desc ? `Topic context: ${desc}\n` : ''}
## One-Line Definition
Precise, exam-ready. Memorize this.

## The 5 Points You Must Know
1.
2.
3.
4.
5.

## The Most Likely Exam Question
State the question, then give the textbook-correct answer.

## Common Traps
- ❌ [Trap 1]: what sounds right but isn't
- ❌ [Trap 2]: the other common confusion

## Memory Trick
A mnemonic, acronym, or visual hook.`;

      // ── Default mode: TOPIC-TYPE AWARE — each type gets a different format ──

      default: {
        const topicType = topic.id.startsWith('sk-intro')  ? 'intro'
                        : topic.id.startsWith('sk-core')   ? 'concept'
                        : topic.id.startsWith('sk-lab')    ? 'lab'
                        : topic.id.startsWith('sk-adv')    ? 'advanced'
                        : 'concept';

        const intro = `${persona}You are teaching an introduction session on **${title}**.
${desc ? `Subtitle: ${desc}\n` : ''}
This is the FIRST time the learner encounters this idea. Do NOT assume prior SK knowledge.

Write as a narrative, NOT as a bullet-dump. Vary your format from the typical "What Is It? / Key Concepts / How It Works" template.

Structure freely, but cover:
1. Open with the concrete problem this solves (one vivid sentence — make the pain real)
2. Reveal the concept as the solution (conversational, 2 paragraphs)
3. The simplest possible working C# example with 5–8 comments explaining each step
4. "Why .NET developers reach for SK" — 3–5 practical reasons (NOT generic bullets)

End each section with a different emoji to signal the shift. Make it feel like a blog post, not a Wikipedia entry.`;

        const concept = `${persona}Write a technical breakdown of **${title}** in Semantic Kernel.
${desc ? `Context: ${desc}\n` : ''}
Target audience: a developer who knows C# and has done the SK basics. Treat them as an equal.

Do NOT use "What Is It?" or "Key Concepts" or "How It Works" as headers — this is a concept deep-dive, not a wiki stub.

Cover in this order (rename headings to match the topic):
1. **Precise API-level definition** — what class/interface/method are we talking about?
2. **The mental model** — one crisp analogy OR a diagram in ASCII
3. **Core usage pattern** — a complete, realistic C# snippet (not minimal, not toy code)
   \`\`\`csharp
   // realistic code with realistic class names
   \`\`\`
4. **Two things that always trip developers up** — with code showing the fix
5. **How this connects to the rest of SK** — one sentence about neighboring concepts`;

        const lab = `${persona}This is a HANDS-ON LAB session on **${title}**.
${desc ? `Lab objective: ${desc}\n` : ''}
Format this as a step-by-step tutorial, NOT as an explanation. Every section should be actionable.

Structure:
## 🎯 What You'll Build
One sentence describing the end result.

## 📦 Prerequisites
What must already be set up (2–3 bullet points, NuGet packages or config).

## Step 1: [Action-oriented title]
Short explanation + code:
\`\`\`csharp
// annotate every line that a beginner might not understand
\`\`\`

## Step 2: [Next action]
...continue for 3–5 steps total...

## ✅ Complete Working Code
One self-contained snippet that runs as-is:
\`\`\`csharp
// Full example, no gaps
\`\`\`

## 🧪 Try It Yourself
Describe a small variation the learner can attempt to solidify understanding.`;

        const advanced = `${persona}Write a PRODUCTION-GRADE technical deep-dive on **${title}** in Semantic Kernel.
${desc ? `Context: ${desc}\n` : ''}
Audience: experienced .NET developers, solutions architects, or tech leads evaluating or optimizing SK.
Skip fundamentals. Get to the depth that separates experts from beginners.

Cover:
1. **Internal model** — how does SK implement this under the hood? (class diagram in words or ASCII OK)
2. **Performance implications** — what are the cost or latency characteristics?
3. **Production configuration** — what settings / patterns matter at scale?
4. **The non-obvious code pattern** — something most tutorials don't show:
   \`\`\`csharp
   // Advanced, production-grade usage
   \`\`\`
5. **Decision framework** — when you SHOULD and SHOULD NOT use this feature`;

        const templates: Record<string, string> = { intro, concept, lab, advanced };
        return templates[topicType];
      }
    }
  }

  retryLesson(): void {
    // Clear cached response so the AI is called fresh
    this.responseCache.delete(`${this.activeTopicId}:${this.activeMode}`);
    this.lessonIsAiFallback = false;
    this.loadLesson(this.activeTopicId, this.activeMode);
  }

  // ── Mentor follow-up ───────────────────────────────────────────────────

  onMentorSend(prompt: string): void {
    if (!prompt.trim() || this.lessonFollowUpLoading) return;

    // Dismiss first-visit hint when user interacts with mentor
    this.dismissHint();

    // Quick-action chips reload the lesson in a specific view mode
    const mode = this.detectModeFromPrompt(prompt);
    if (mode) {
      this.activeMode = mode;
      this.loadLesson(this.activeTopicId, mode);
      return;
    }

    // Freeform text → append to follow-up conversation thread
    this.lessonMessages.push({ role: 'user', text: prompt });
    this.lessonFollowUpLoading = true;
    this.cdr.markForCheck();

    const context = this.lessonMessages[0]?.text ?? '';
    const sysCtx = `You are an expert C# and .NET mentor for Microsoft Semantic Kernel. Never use filler phrases. Only write C# code examples. Respond concisely and accurately.`;
    const fullQuestion = `${sysCtx}\n\n${prompt}\n\nContext from current lesson on "${this.activeTopic?.title}":\n${context.substring(0, 600)}`;

    // Use streaming for follow-ups too — gives live ChatGPT-style typing effect
    let streamingMsgAdded = false;

    this.lessonSub = this.aiSvc.getOllamaExplanation(fullQuestion).subscribe({
      next: (res: any) => {
        if (res.done === false) {
          if (!streamingMsgAdded) {
            this.lessonMessages.push({ role: 'ai', text: res.explanation ?? '' });
            streamingMsgAdded = true;
          } else {
            this.lessonMessages[this.lessonMessages.length - 1] = { role: 'ai', text: res.explanation ?? '' };
          }
          this.cdr.markForCheck();
        } else {
          // Final — lock in the completed response
          const finalText = res.explanation?.trim() || 'Sorry, I could not get a response right now. Please try again.';
          if (streamingMsgAdded) {
            this.lessonMessages[this.lessonMessages.length - 1] = { role: 'ai', text: finalText };
          } else {
            this.lessonMessages.push({ role: 'ai', text: finalText });
          }
          this.lessonFollowUpLoading = false;
          this.cdr.markForCheck();
        }
      },
      error: () => {
        this.lessonMessages.push({ role: 'ai', text: 'An error occurred. Please try again.' });
        this.lessonFollowUpLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Maps MENTOR_CHIPS prompt text to mode identifiers.
   * Returns null for freeform questions (treated as follow-ups).
   */
  private detectModeFromPrompt(prompt: string): string | null {
    const p = prompt.toLowerCase();
    if (p.startsWith('please explain this concept in even simpler') ||
        p.includes('as if i am a complete beginner')) return 'simple';
    if (p.startsWith('give me a memorable real-world analogy')) return 'analogy';
    if (p.startsWith('write a short, practical, runnable code example')) return 'deep';
    if (p.startsWith('give me a typical interview question')) return 'interview';
    if (p.startsWith('what are the most common mistakes and misconceptions')) return 'mistakes';
    if (p.startsWith('give me the most important exam tips')) return 'exam';
    if (p.startsWith('generate a structured visual breakdown')) return 'structured';
    return null;
  }

  get activeModeLabel(): string {
    const labels: Record<string, string> = {
      simple:     'Simple View',
      analogy:    'Analogy View',
      deep:       'Code Examples',
      interview:  'Interview View',
      mistakes:   'Common Mistakes',
      exam:       'Exam Tips',
      structured: 'Structured Notes',
    };
    return labels[this.activeMode] ?? '';
  }

  dismissHint(): void {
    if (!this.showFirstVisitHint) return;
    this.showFirstVisitHint = false;
    try { localStorage.setItem('sk_hint_dismissed', 'true'); } catch { /* quota */ }
    this.cdr.markForCheck();
  }

  // ── Notes ───────────────────────────────────────────────────────────────

  onMentorAddNote(text: string): void {
    if (!text.trim()) return;
    this.inlineNotes.unshift({
      topic: this.activeTopic?.title ?? 'Semantic Kernel Note',
      text,
    });
    this.cdr.markForCheck();

    this.notesSvc.saveNote(
      this.activeTopic?.title ?? 'Semantic Kernel',
      'Semantic Kernel',
      text,
      ['semantic-kernel', 'sk'],
      'semantic-kernel',
      this.activeTopicId,
    ).catch(() => { /* silently swallow */ });
  }

  deleteInlineNote(index: number): void {
    this.inlineNotes.splice(index, 1);
    this.cdr.markForCheck();
  }

  // ── Playground ─────────────────────────────────────────────────────────

  resetPg(): void {
    this.pgSub?.unsubscribe();
    this.pgOutput  = '';
    this.pgError   = '';
    this.pgLoading = false;
    this.pgMs      = 0;
    this.cdr.markForCheck();
  }

  onRunInPlayground(code: string): void {
    this.handleTryNow(code);
  }

  /**
   * Smart Try Now handler: if the supplied text looks like real C# code use it
   * directly; otherwise fall back to the per-topic starter code so the user
   * always gets something runnable (e.g. clicking on an ASCII architecture
   * diagram or a shell command block).
   */
  private handleTryNow(code: string): void {
    const trimmed = code.trim();
    const looksLikeCSharp =
      trimmed.length > 30 &&
      (/^\s*(using\s|var\s|\/\/|class\s|public\s|private\s|Console\.|namespace\s|int\s|string\s|bool\s|await\s|async\s)/.test(trimmed) ||
       /using\s+[A-Z]/.test(trimmed));
    this.pgCode = looksLikeCSharp
      ? trimmed
      : (SK_LAB_CODE[this.activeTopicId] ?? SK_DEFAULT_CODE);
    this.pgLoadToken++;
    this.resetPg();
    this.showToast(
      looksLikeCSharp ? '⚡ Code loaded — click ▶ Run Code!' : '💡 Starter code loaded for this topic!',
      'info',
    );
    this.cdr.markForCheck();
    setTimeout(() => {
      const el = document.querySelector('app-lw-playground');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }

  onPgRun(event: { code: string; mode: string }): void {
    const { code, mode } = event;
    this.pgCode    = code;
    if (!code.trim() && mode !== 'challenge') return;
    if (this.pgLoading) return;

    this.pgSub?.unsubscribe();
    this.pgOutput  = '';
    this.pgError   = '';
    this.pgLoading = true;
    const t0       = Date.now();

    const topicTitle = this.activeTopic?.title ?? 'Semantic Kernel';
    const prompts: Record<string, string> = {
      run:       `Execute this C# Semantic Kernel code and show exactly what the output would be. Return only the console output, formatted clearly:\n\`\`\`csharp\n${code}\n\`\`\``,
      explain:   `Explain this Semantic Kernel C# code step-by-step. What does each section do and how does SK orchestrate it?\n\`\`\`csharp\n${code}\n\`\`\``,
      debug:     `Find and fix all bugs in this Semantic Kernel C# code. List each issue and show the corrected code:\n\`\`\`csharp\n${code}\n\`\`\``,
      optimize:  `Optimize this Semantic Kernel C# code for performance and readability. Show the improved version with a brief explanation:\n\`\`\`csharp\n${code}\n\`\`\``,
      comments:  `Add clear, detailed comments to every significant line of this Semantic Kernel C# code:\n\`\`\`csharp\n${code}\n\`\`\``,
      challenge: `Give me a hands-on Semantic Kernel coding challenge related to "${topicTitle}" in C#. Include:\n1. Problem statement\n2. Example usage\n3. Hints\n4. Reference solution`,
    };

    const prompt = prompts[mode] ?? prompts['run'];

    this.pgSub = this.aiSvc.explainTopicInDetail(prompt, 'Semantic Kernel').subscribe({
      next:     (r: any) => {
        this.pgOutput = r?.explanation ?? r?.text ?? JSON.stringify(r);
      },
      error:    (e: any) => {
        this.pgError   = e?.message ?? 'Error. Please try again.';
        this.pgLoading = false;
        this.cdr.markForCheck();
      },
      complete: () => {
        this.pgMs      = Date.now() - t0;
        this.pgLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  onPgSaveNote(text: string): void {
    this.inlineNotes.unshift({
      topic: `[Code Lab] ${this.activeTopic?.title ?? 'Semantic Kernel'}`,
      text,
    });
    this.cdr.markForCheck();

    this.notesSvc.saveNote(
      `[Code Lab] ${this.activeTopic?.title ?? 'Semantic Kernel'}`,
      'Semantic Kernel',
      text,
      ['semantic-kernel', 'code-lab'],
      'semantic-kernel',
      this.activeTopicId,
    ).catch(() => { /* silently swallow */ });
  }

  // ── Panel state ─────────────────────────────────────────────────────────

  toggleLeftPanel():  void {
    this.leftPanelCollapsed  = !this.leftPanelCollapsed;
    this.cdr.markForCheck();
  }

  toggleRightPanel(): void {
    this.rightPanelCollapsed = !this.rightPanelCollapsed;
    this.cdr.markForCheck();
  }

  // ── Toast ───────────────────────────────────────────────────────────────

  showToast(msg: string, type: 'success' | 'error' | 'info' = 'info'): void {
    clearTimeout(this.toastTimer);
    this.toast = { msg, type };
    this.cdr.markForCheck();
    this.toastTimer = setTimeout(() => {
      this.toast = null;
      this.cdr.markForCheck();
    }, 3500);
  }
}
