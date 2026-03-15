import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ElementRef, ViewChild, ChangeDetectorRef,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CustomAuthService } from '../shared/custom-auth.service';
import { NotesService } from '../shared/notes.service';
import { AILearnService } from '../services/ai-learn.service';

// Language definitions
export interface PlaygroundLang {
  id:    'javascript' | 'typescript' | 'python';
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

  // ── Save to Notes ─────────────────────────────────────────────────────────
  saveSuccess = false;
  saveFail    = false;
  private saveTimer: any;

  constructor(
    private auth:    CustomAuthService,
    private notesSvc: NotesService,
    private aiSvc:   AILearnService,
    private cdr:     ChangeDetectorRef,
  ) {}

  ngOnInit(): void {}

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
      value:              this.selectedLang.starter,
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
  }

  // ── Language switching ────────────────────────────────────────────────────
  selectLang(lang: PlaygroundLang): void {
    if (this.selectedLang.id === lang.id) return;
    this.selectedLang = lang;
    if (this.editor && (window as any).monaco) {
      const monaco = (window as any).monaco;
      const model  = this.editor.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, lang.monacoId);
        // Offer starter code only if editor is basically empty
        const val = this.editor.getValue().trim();
        if (!val || val === this.langs.find(l => l.id !== lang.id)?.starter?.trim()) {
          this.editor.setValue(lang.starter);
        }
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

    if (this.selectedLang.id === 'javascript' || this.selectedLang.id === 'typescript') {
      this.runJs(code);
    } else if (this.selectedLang.id === 'python') {
      this.addOutput('⚠️ Python execution requires a server-side sandbox. Click "Explain Code" to analyse your code with AI.', 'warn');
      this.addOutput('💡 Tip: Use browser JS/TS to run code interactively here.', 'info');
      this.isRunning = false;
    }
    this.cdr.detectChanges();
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
    explain: (c, l) =>
      `Explain the following ${l} code step by step. Describe what it does, how it works, and highlight any interesting patterns:\n\n\`\`\`${l}\n${c}\n\`\`\``,
    improve: (c, l) =>
      `Review this ${l} code and suggest improvements for readability, performance, and best practices. Show the improved version with comments:\n\n\`\`\`${l}\n${c}\n\`\`\``,
    bugs: (c, l) =>
      `Analyze this ${l} code for bugs, errors, edge cases, and potential runtime issues. List each problem and how to fix it:\n\n\`\`\`${l}\n${c}\n\`\`\``,
    tests: (c, l) =>
      `Generate comprehensive unit tests for the following ${l} code. Cover happy paths, edge cases, and error scenarios:\n\n\`\`\`${l}\n${c}\n\`\`\``,
  };

  runAiAction(action: 'explain' | 'improve' | 'bugs' | 'tests'): void {
    const code = this.currentCode.trim();
    if (!code) return;

    const labels: Record<string, string> = {
      explain: '💡 Explaining Code…',
      improve: '✨ Improving Code…',
      bugs:    '🔍 Analysing Bugs…',
      tests:   '🧪 Generating Tests…',
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
