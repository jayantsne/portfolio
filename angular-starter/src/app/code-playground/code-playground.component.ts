import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ElementRef, ViewChild, ChangeDetectorRef, HostListener,
} from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { CustomAuthService } from '../shared/custom-auth.service';
import { NotesService } from '../shared/notes.service';
import { AILearnService } from '../services/ai-learn.service';
import { PlaygroundService, PlaygroundRequest } from '../services/playground.service';
import { environment } from '../../environments/environment';

// Language definitions
export interface PlaygroundLang {
  id:    'javascript' | 'typescript' | 'python' | 'csharp';
  label: string;
  icon:  string;
  monacoId: string;
  starter: string;
}

const LANGS: PlaygroundLang[] = [
  {
    id: 'javascript', label: 'JavaScript', icon: '🟨', monacoId: 'javascript',
    starter:
`// JavaScript Playground
function greet(name) {
  return \`Hello, \${name}! 👋\`;
}

console.log(greet('World'));
console.log('The answer is', 6 * 7);
`,
  },
  {
    id: 'typescript', label: 'TypeScript', icon: '🔷', monacoId: 'typescript',
    starter:
`// TypeScript Playground
interface User {
  name: string;
  age: number;
}

function greet(user: User): string {
  return \`Hello, \${user.name}! You are \${user.age} years old.\`;
}

const user: User = { name: 'World', age: 30 };
console.log(greet(user));
`,
  },
  {
    id: 'python', label: 'Python', icon: '🐍', monacoId: 'python',
    starter:
`# Python Playground
def greet(name: str) -> str:
    return f"Hello, {name}! 👋"

def fibonacci(n: int) -> list[int]:
    seq = [0, 1]
    for _ in range(n - 2):
        seq.append(seq[-1] + seq[-2])
    return seq[:n]

print(greet("World"))
print("Fibonacci:", fibonacci(8))
`,
  },
  {
    id: 'csharp', label: 'C#', icon: '🔵', monacoId: 'csharp',
    starter:
`// C# Playground
// Note: Use AI actions to analyze, refactor, or explain your code.
using System;

class Program {
    static void Main() {
        Console.WriteLine(Greet("World"));

        // Fibonacci
        int a = 0, b = 1;
        Console.Write("Fibonacci: ");
        for (int i = 0; i < 8; i++) {
            Console.Write(a + " ");
            int tmp = a + b; a = b; b = tmp;
        }
        Console.WriteLine();
    }

    static string Greet(string name) => $"Hello, {name}! 👋";
}
`,
  },
];

declare const require: any;

@Component({
  selector: 'app-code-playground',
  templateUrl: './code-playground.component.html',
  styleUrls: ['./code-playground.component.css'],
})
export class CodePlaygroundComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('monacoContainer') monacoContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('outputScroll')    outputScroll!:    ElementRef<HTMLDivElement>;

  // ── Language state ────────────────────────────────────────────────────────
  readonly langs = LANGS;
  selectedLang: PlaygroundLang = LANGS[0];

  // ── Monaco editor instance ────────────────────────────────────────────────
  private editor: any = null;
  private monacoReady = false;
  editorLoading = true;

  // ── Code execution ────────────────────────────────────────────────────────
  outputLines: { text: string; type: 'log' | 'error' | 'info' | 'warn' }[] = [];
  isRunning = false;

  // ── AI panel ──────────────────────────────────────────────────────────────
  aiPanel: 'idle' | 'loading' | 'result' = 'idle';
  aiStreamText  = '';
  aiActionLabel = '';
  private aiSub: Subscription | null = null;

  // ── Fullscreen ─────────────────────────────────────────────────────────────
  isFullscreen = false;

  // ── Save to Notes ─────────────────────────────────────────────────────────
  saveSuccess = false;
  saveFail    = false;
  private saveTimer: any;

  constructor(
    private auth:    CustomAuthService,
    private notesSvc: NotesService,
    private aiSvc:   AILearnService,
    private cdr:     ChangeDetectorRef,
    private http:    HttpClient,
    private pgSvc:   PlaygroundService,
  ) {}

  private pendingRequest: PlaygroundRequest | null = null;

  ngOnInit(): void {
    this.pendingRequest = this.pgSvc.consume();
    if (this.pendingRequest) {
      const match = LANGS.find(l => l.id === this.pendingRequest!.language);
      if (match) this.selectedLang = match;
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeydown(e: KeyboardEvent): void {
    if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); this.runCode(); }
    if (e.key === 'Escape' && this.isFullscreen) { this.isFullscreen = false; this.cdr.detectChanges(); }
  }

  // ── Load Monaco from CDN ─────────────────────────────────────────────────
  ngAfterViewInit(): void {
    this.loadMonaco().then(() => {
      this.initEditor();
    }).catch(() => {
      this.editorLoading = false;
      this.cdr.detectChanges();
    });
  }

  private loadMonaco(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if ((window as any).monaco) { resolve(); return; }
      // Check whether loader is already injected
      const existing = document.getElementById('monaco-loader-script');
      if (existing) {
        const poll = setInterval(() => {
          if ((window as any).monaco) { clearInterval(poll); resolve(); }
        }, 100);
        return;
      }
      const script   = document.createElement('script');
      script.id      = 'monaco-loader-script';
      script.src     = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js';
      script.onload  = () => {
        (window as any).require.config({
          paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' },
        });
        (window as any).require(['vs/editor/editor.main'], () => resolve());
      };
      script.onerror = () => reject(new Error('Failed to load Monaco'));
      document.head.appendChild(script);
    });
  }

  private initEditor(): void {
    if (!this.monacoContainer?.nativeElement) return;
    const monaco = (window as any).monaco;
    this.monacoReady = true;
    this.editorLoading = false;

    this.editor = monaco.editor.create(this.monacoContainer.nativeElement, {
      value:              this.loadSession(this.selectedLang.id) ?? this.selectedLang.starter,
      language:           this.selectedLang.monacoId,
      theme:              'vs-dark',
      fontSize:           14,
      lineHeight:         22,
      minimap:            { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout:    true,
      tabSize:            2,
      wordWrap:           'on',
      fontFamily:         "'Fira Code', 'Cascadia Code', Consolas, monospace",
      fontLigatures:      true,
      cursorBlinking:     'smooth',
      renderLineHighlight: 'gutter',
      padding:            { top: 12, bottom: 12 },
    });

    this.cdr.detectChanges();

    // Apply any pending request from PlaygroundService ("Try Now" flow)
    if (this.pendingRequest) {
      this.editor.setValue(this.pendingRequest.code);
      if ((window as any).monaco) {
        const model = this.editor.getModel();
        if (model) {
          (window as any).monaco.editor.setModelLanguage(model, this.selectedLang.monacoId);
        }
      }
      this.pgSvc.clear();
      this.pendingRequest = null;
    }
  }

  // ── Language switching ────────────────────────────────────────────────────
  selectLang(lang: PlaygroundLang): void {
    if (this.selectedLang.id === lang.id) return;
    // Persist current session before switching
    if (this.editor) this.saveSession(this.selectedLang.id, this.editor.getValue());
    this.selectedLang = lang;
    if (this.editor && (window as any).monaco) {
      const monaco = (window as any).monaco;
      const model  = this.editor.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, lang.monacoId);
        const saved = this.loadSession(lang.id);
        this.editor.setValue(saved ?? lang.starter);
      }
    }
    this.clearOutput();
    this.clearAi();
  }

  get currentCode(): string {
    return this.editor ? this.editor.getValue() : '';
  }

  copyCode(): void {
    navigator.clipboard.writeText(this.currentCode).catch(() => {});
  }

  resetCode(): void {
    if (this.editor) this.editor.setValue(this.selectedLang.starter);
    this.clearOutput();
    this.clearAi();
  }

  // ── Code execution ────────────────────────────────────────────────────────
  runCode(): void {
    this.clearOutput();
    this.isRunning = true;
    const code = this.currentCode;

    if (this.selectedLang.id === 'javascript') {
      // JS runs instantly in browser without a network round-trip
      this.runJs(code);
    } else {
      // TypeScript, Python, C# → server-side sandbox
      this.runSandbox(this.selectedLang.id, code);
    }
    this.cdr.detectChanges();
  }

  private runSandbox(language: string, code: string): void {
    this.addOutput(`⏳ Running ${this.selectedLang.label} in sandbox…`, 'info');
    this.cdr.detectChanges();

    const url     = `${environment.apiUrl}/code/execute`;
    const headers = new HttpHeaders({ 'X-API-Key': environment.apiKey });
    const body    = { language, code };

    this.http.post<{
      stdout: string; stderr: string; compileOutput: string;
      executionTime: string; status: string; success: boolean;
    }>(url, body, { headers }).subscribe({
      next: res => {
        // Clear the ⏳ spinner line
        this.outputLines = this.outputLines.filter(l => !l.text.startsWith('⏳'));

        if (res.stdout) {
          res.stdout.split('\n').filter(Boolean).forEach(line =>
            this.addOutput(line, 'log'));
        }

        if (res.stderr) {
          res.stderr.split('\n').filter(Boolean).forEach(line =>
            this.addOutput(line, 'error'));
        } else if (res.compileOutput && !res.success) {
          res.compileOutput.split('\n').filter(Boolean).forEach(line =>
            this.addOutput(line, 'error'));
        }

        const icon = res.success ? '✅' : '❌';
        this.addOutput(`${icon} ${res.status}  ·  ⏱ ${res.executionTime}`, 'info');
        this.isRunning = false;
        this.cdr.detectChanges();
        setTimeout(() => this.scrollOutput(), 50);
      },
      error: err => {
        this.outputLines = this.outputLines.filter(l => !l.text.startsWith('⏳'));
        const msg = err.error?.error ?? err.message ?? 'Unknown error';
        this.addOutput(`❌ Sandbox error: ${msg}`, 'error');
        this.addOutput('💡 Tip: Make sure the backend is running and a Judge0 API key is configured.', 'info');
        this.isRunning = false;
        this.cdr.detectChanges();
        setTimeout(() => this.scrollOutput(), 50);
      },
    });
  }

  private runJs(code: string): void {
    const logs: { text: string; type: 'log' | 'error' | 'info' | 'warn' }[] = [];
    const originalConsole = { ...console };
    // Patch console
    const makeLogger = (type: 'log' | 'info' | 'warn' | 'error') => (...args: any[]) => {
      logs.push({ text: args.map(a => this.serialize(a)).join(' '), type });
    };
    (console as any).log   = makeLogger('log');
    (console as any).info  = makeLogger('info');
    (console as any).warn  = makeLogger('warn');
    (console as any).error = makeLogger('error');

    const start = performance.now();
    try {
      // Use Function constructor to avoid full eval scope
      const fn = new Function(code);
      fn();
      const ms = (performance.now() - start).toFixed(1);
      this.addOutput(`✅ Execution completed in ${ms}ms`, 'info');
    } catch (err: any) {
      this.addOutput(`❌ ${err?.toString() ?? 'Unknown error'}`, 'error');
    } finally {
      // Restore
      (console as any).log   = originalConsole.log;
      (console as any).info  = originalConsole.info;
      (console as any).warn  = originalConsole.warn;
      (console as any).error = originalConsole.error;
    }
    logs.forEach(l => this.addOutput(l.text, l.type));
    this.isRunning = false;
    setTimeout(() => this.scrollOutput(), 50);
  }

  private serialize(val: any): string {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (typeof val === 'object') {
      try { return JSON.stringify(val, null, 2); } catch { return String(val); }
    }
    return String(val);
  }

  private addOutput(text: string, type: 'log' | 'error' | 'info' | 'warn' = 'log'): void {
    this.outputLines.push({ text, type });
  }

  private clearOutput(): void { this.outputLines = []; }

  private scrollOutput(): void {
    const el = this.outputScroll?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  // ── AI actions ────────────────────────────────────────────────────────────

  private readonly AI_PROMPTS: Record<string, (code: string, lang: string) => string> = {
    explain:  (c, l) =>
      `Explain the following ${l} code step by step. Describe what it does, how it works, and highlight any interesting patterns:\n\n\`\`\`${l}\n${c}\n\`\`\``,
    improve:  (c, l) =>
      `Review this ${l} code and suggest improvements for readability, performance, and best practices. Show the improved version with comments:\n\n\`\`\`${l}\n${c}\n\`\`\``,
    bugs:     (c, l) =>
      `Analyze this ${l} code for bugs, errors, edge cases, and potential runtime issues. List each problem and how to fix it:\n\n\`\`\`${l}\n${c}\n\`\`\``,
    tests:    (c, l) =>
      `Generate comprehensive unit tests for the following ${l} code. Cover happy paths, edge cases, and error scenarios:\n\n\`\`\`${l}\n${c}\n\`\`\``,
    refactor: (c, l) =>
      `Refactor the following ${l} code to improve its structure, reduce complexity, and follow clean code principles. Show the refactored version with a brief explanation:\n\n\`\`\`${l}\n${c}\n\`\`\``,
    comments: (c, l) =>
      `Add clear, concise inline comments to the following ${l} code. Explain what each section does, document function parameters and return values, and clarify any non-obvious logic:\n\n\`\`\`${l}\n${c}\n\`\`\``,
    convert:  (c, l) =>
      `Convert the following ${l} code to a different language. Suggest the most appropriate target language for this code, provide the full converted version, and note key differences:\n\n\`\`\`${l}\n${c}\n\`\`\``,
    optimize: (c, l) =>
      `Analyze and optimize the following ${l} code for performance. Identify bottlenecks, memory issues, and algorithmic inefficiencies, then provide an optimized version with explanations:\n\n\`\`\`${l}\n${c}\n\`\`\``,
    exercise: (c, l) =>
      `Based on the concepts used in the following ${l} code, generate a coding exercise or challenge. Include a clear problem statement, sample inputs/outputs, hints, and a model solution:\n\n\`\`\`${l}\n${c}\n\`\`\``,
  };

  runAiAction(action: 'explain' | 'improve' | 'bugs' | 'tests' | 'refactor' | 'comments' | 'convert' | 'optimize' | 'exercise'): void {
    const code = this.currentCode.trim();
    if (!code) return;

    const labels: Record<string, string> = {
      explain:  '💡 Explaining Code…',
      improve:  '✨ Improving Code…',
      bugs:     '🔍 Analysing Bugs…',
      tests:    '🧪 Generating Tests…',
      refactor: '🔧 Refactoring Code…',
      comments: '💬 Adding Comments…',
      convert:  '🔄 Converting Language…',
      optimize: '⚡ Optimising Performance…',
      exercise: '🎯 Generating Exercise…',
    };

    this.clearAi();
    this.aiPanel      = 'loading';
    this.aiActionLabel = labels[action];
    this.aiSub?.unsubscribe();

    const prompt = this.AI_PROMPTS[action](code, this.selectedLang.label);

    this.aiSub = this.aiSvc.getOllamaExplanation(prompt).subscribe({
      next: res => {
        this.aiStreamText = res.explanation;
        this.aiPanel      = res.done ? 'result' : 'loading';
        this.cdr.detectChanges();
        this.scrollAiPanel();
      },
      error: () => {
        this.aiPanel = 'result';
        this.aiStreamText = '⚠️ Connection error. Please try again.';
        this.cdr.detectChanges();
      },
      complete: () => {
        this.aiPanel = 'result';
        this.cdr.detectChanges();
      },
    });
  }

  stopAi(): void {
    this.aiSub?.unsubscribe();
    this.aiSub  = null;
    this.aiPanel = this.aiStreamText ? 'result' : 'idle';
    this.cdr.detectChanges();
  }

  private clearAi(): void {
    this.aiSub?.unsubscribe();
    this.aiSub       = null;
    this.aiPanel      = 'idle';
    this.aiStreamText = '';
    this.aiActionLabel = '';
  }

  @ViewChild('aiScroll') aiScroll!: ElementRef<HTMLDivElement>;
  private scrollAiPanel(): void {
    setTimeout(() => {
      const el = this.aiScroll?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  }

  // ── Save to Notes ─────────────────────────────────────────────────────────
  saveToNotes(): void {
    const code = this.currentCode.trim();
    if (!code) return;

    const lang    = this.selectedLang.label;
    const aiPart  = this.aiStreamText.trim()
      ? `\n\n---\n### 🤖 AI Analysis\n\n${this.aiStreamText.trim()}`
      : '';
    const content = `## ${lang} Code\n\n\`\`\`${this.selectedLang.id}\n${code}\n\`\`\`${aiPart}`;

    this.notesSvc.saveNote(
      `${lang} Playground Snippet`,
      'Programming',
      content,
      ['code', lang.toLowerCase(), 'playground'],
    ).then(() => {
      this.saveSuccess = true;
      this.saveFail    = false;
      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => { this.saveSuccess = false; this.cdr.detectChanges(); }, 3000);
    }).catch(() => {
      this.saveFail = true;
      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => { this.saveFail = false; this.cdr.detectChanges(); }, 3000);
    });
    this.cdr.detectChanges();
  }

  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    this.cdr.detectChanges();
  }

  private saveSession(langId: string, code: string): void {
    try { localStorage.setItem(`pg_session_${langId}`, code); } catch {}
  }

  private loadSession(langId: string): string | null {
    try { return localStorage.getItem(`pg_session_${langId}`); } catch { return null; }
  }

  get isLoggedIn(): boolean { return !!this.auth.currentUser; }

  ngOnDestroy(): void {
    this.aiSub?.unsubscribe();
    clearTimeout(this.saveTimer);
    if (this.editor) {
      this.editor.dispose();
      this.editor = null;
    }
  }
}
