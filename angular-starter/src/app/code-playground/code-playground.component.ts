import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ElementRef, ViewChild, ChangeDetectorRef, HostListener,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { CustomAuthService } from '../shared/custom-auth.service';
import { NotesService } from '../shared/notes.service';
import { AILearnService } from '../services/ai-learn.service';
import { PlaygroundService, PlaygroundRequest } from '../services/playground.service';

// ── Project file / template types ────────────────────────────────────────────

export interface ProjectFile {
  name:       string;   // filename, e.g. 'app.component.ts'
  path:       string;   // relative path, e.g. 'src/app/app.component.ts'
  monacoLang: string;   // Monaco language id
  code:       string;
}

export type ProjectRunAs = 'javascript' | 'typescript' | 'csharp' | 'sql';

export interface ProjectTemplate {
  id:          'javascript' | 'typescript' | 'csharp' | 'sql';
  label:       string;
  icon:        string;
  description: string;
  createFiles: () => ProjectFile[];
  entryFile:   string;    // path of the file to execute on Run
  runAs:       ProjectRunAs;
}

export interface SidebarEntry {
  kind:  'dir' | 'file';
  depth: number;
  name:  string;
  path:  string;
  file?: ProjectFile;
}

// ── Project templates ─────────────────────────────────────────────────────────

const TEMPLATES: ProjectTemplate[] = [

  // ── JavaScript ───────────────────────────────────────────────────────────
  {
    id: 'javascript', label: 'JavaScript', icon: '🟨',
    description: 'Run JavaScript in your browser — real console output',
    entryFile: 'script.js',
    runAs: 'javascript',
    createFiles: () => [
      {
        name: 'script.js', path: 'script.js', monacoLang: 'javascript',
        code:
`// JavaScript Playground — runs in your browser
// console.log() → output panel  •  Ctrl+Enter to run

// 1. Variables & types
const language = 'JavaScript';
const year     = new Date().getFullYear();
console.log(\`Hello from \${language}! (\${year})\`);

// 2. Functions
function greet(name, greeting = 'Hello') {
  return \`\${greeting}, \${name}!\`;
}
console.log(greet('World'));

// 3. Array methods
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const evens   = numbers.filter(n => n % 2 === 0);
const squares = evens.map(n => n * n);
console.log('Evens  :', evens.join(', '));
console.log('Squares:', squares.join(', '));

// 4. Objects & destructuring
const person = { name: 'Alice', age: 28, role: 'developer' };
const { name: who, role } = person;
console.log(\`\${who} is a \${role}\`);

// 5. Async / Promise
async function fetchData() {
  const result = await Promise.resolve({ status: 'ok', data: [1, 2, 3] });
  console.log('Async result:', JSON.stringify(result));
}
await fetchData();
`,
      },
    ],
  },

  // ── TypeScript ───────────────────────────────────────────────────────────
  {
    id: 'typescript', label: 'TypeScript', icon: '🔷',
    description: 'TypeScript — compiled in browser via CDN, runs in Web Worker',
    entryFile: 'main.ts',
    runAs: 'typescript',
    createFiles: () => [
      {
        name: 'main.ts', path: 'main.ts', monacoLang: 'typescript',
        code:
`// TypeScript Playground — compiled in your browser, no install needed
// Ctrl+Enter to run

// 1. Interfaces & types
interface User {
  id:    number;
  name:  string;
  email: string;
  role:  'admin' | 'user' | 'guest';
}

// 2. Generic function
function getById<T extends { id: number }>(items: T[], id: number): T | undefined {
  return items.find(item => item.id === id);
}

// 3. Data
const users: User[] = [
  { id: 1, name: 'Alice',   email: 'alice@example.com',   role: 'admin' },
  { id: 2, name: 'Bob',     email: 'bob@example.com',     role: 'user'  },
  { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'guest' },
];

console.log('All users:');
users.forEach(u => console.log(\`  [\${u.role}] \${u.name} <\${u.email}>\`));

const found = getById(users, 2);
console.log(\`\\nFound by id=2: \${found?.name ?? 'not found'}\`);

// 4. Class with typed methods
class Stack<T> {
  private items: T[] = [];

  push(item: T): void  { this.items.push(item); }
  pop():  T | undefined { return this.items.pop(); }
  peek(): T | undefined { return this.items.at(-1); }
  get size(): number    { return this.items.length; }
}

const stack = new Stack<number>();
[1, 2, 3, 4, 5].forEach(n => stack.push(n));
console.log(\`\\nStack peek: \${stack.peek()}, size: \${stack.size}\`);
console.log('Popped:', stack.pop());
console.log('After pop size:', stack.size);

// 5. Async / await with typed result
async function fetchUser(id: number): Promise<User | null> {
  await new Promise(r => setTimeout(r, 10)); // simulate async
  return users.find(u => u.id === id) ?? null;
}

const user = await fetchUser(1);
console.log(\`\\nAsync fetch: \${user?.name} (\${user?.role})\`);
`,
      },
    ],
  },

  // ── C# ───────────────────────────────────────────────────────────────────
  {
    id: 'csharp', label: 'C#', icon: '🔵',
    description: 'C# with .NET — runs on backend Roslyn sandbox',
    entryFile: 'Program.cs',
    runAs: 'csharp',
    createFiles: () => [
      {
        name: 'Program.cs', path: 'Program.cs', monacoLang: 'csharp',
        code:
`// C# Playground — runs on a .NET Roslyn sandbox
using System;
using System.Collections.Generic;
using System.Linq;

// 1. Record type (C# 9+)
record Product(int Id, string Name, string Category, decimal Price, int Stock);

// 2. Sample data
var products = new List<Product>
{
    new(1, "Laptop",       "Electronics",  999.99m, 50),
    new(2, "Headphones",   "Electronics",  199.99m, 120),
    new(3, "Clean Code",   "Books",          35.00m, 200),
    new(4, "TypeScript",   "Books",          29.99m, 180),
    new(5, "T-Shirt",      "Clothing",       19.99m, 500),
    new(6, "Coffee Beans", "Food",           14.99m, 800),
};

// 3. LINQ queries
Console.WriteLine("=== Products by Category ===");
var grouped = products.GroupBy(p => p.Category);
foreach (var group in grouped)
{
    Console.WriteLine($"  {group.Key}:");
    foreach (var p in group.OrderBy(x => x.Price))
        Console.WriteLine($"    {p.Name,-20} \${p.Price,8:F2}  (stock: {p.Stock})");
}

// 4. Aggregate
var totalValue = products.Sum(p => p.Price * p.Stock);
Console.WriteLine($"\\nTotal inventory value: \${totalValue:F2}");

var mostExpensive = products.MaxBy(p => p.Price);
Console.WriteLine($"Most expensive: {mostExpensive!.Name} (\${mostExpensive.Price:F2})");

// 5. Generic method
static T[] Shuffle<T>(IEnumerable<T> source)
{
    var arr = source.ToArray();
    var rng = new Random(42);
    for (int i = arr.Length - 1; i > 0; i--)
    {
        int j = rng.Next(i + 1);
        (arr[i], arr[j]) = (arr[j], arr[i]);
    }
    return arr;
}

var shuffled = Shuffle(products.Select(p => p.Name));
Console.WriteLine("\\nShuffled names: " + string.Join(", ", shuffled));
`,
      },
    ],
  },

  // ── SQL ──────────────────────────────────────────────────────────────────
  {
    id: 'sql', label: 'SQL', icon: '🗄',
    description: 'In-browser SQL — predefined tables (users, orders, products)',
    entryFile: 'query.sql',
    runAs: 'sql',
    createFiles: () => [
      {
        name: 'query.sql', path: 'query.sql', monacoLang: 'sql',
        code:
`-- SQL Playground — predefined tables are loaded automatically.
-- Available tables: users, orders, products, categories
--
-- users:      id, name, email, age, city
-- orders:     id, user_id, amount, status, created_at
-- products:   id, name, category_id, price, stock
-- categories: id, name

-- Query 1: All users
SELECT * FROM users;

-- Query 2: Orders over \$100 with customer names
SELECT u.name, o.amount, o.status
FROM   orders o
JOIN   users u ON u.id = o.user_id
WHERE  o.amount > 100
ORDER  BY o.amount DESC;

-- Query 3: Product inventory by category
SELECT c.name AS category, COUNT(*) AS products, SUM(p.stock) AS total_stock
FROM   products p
JOIN   categories c ON c.id = p.category_id
GROUP  BY c.name
ORDER  BY total_stock DESC;
`,
      },
    ],
  },
];


@Component({
  selector: 'app-code-playground',
  templateUrl: './code-playground.component.html',
  styleUrls: ['./code-playground.component.css'],
})
export class CodePlaygroundComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('monacoContainer') monacoContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('outputScroll')    outputScroll!:    ElementRef<HTMLDivElement>;

  // ── Language state ────────────────────────────────────────────────────────
  readonly templates = TEMPLATES;
  selectedTemplate: ProjectTemplate = TEMPLATES[0]; // JavaScript is index 0

  // ── Monaco editor instance ────────────────────────────────────────────────
  private editor: any = null;
  private monacoReady = false;
  editorLoading = true;

  // ── Code execution ────────────────────────────────────────────────────────
  outputLines: { text: string; type: 'log' | 'error' | 'info' | 'warn' }[] = [];
  isRunning = false;
  execStatus: 'idle' | 'success' | 'error' = 'idle';
  execStatusMsg = '';
  execTime = '';

  // ── stdin (shown for C# / server-side languages) ─────────────────────────
  stdinText  = '';
  stdinOpen  = false;

  // ── TypeScript / SQL compiler loaders (lazy CDN) ──────────────────────────
  private tsCompilerLoading:  Promise<void> | null = null;
  private sqlEngineLoading:   Promise<void> | null = null;

  // ── AI modal drawer ───────────────────────────────────────────────
  aiModalOpen = false;

  // ── AI panel ──────────────────────────────────────────────────────────────
  aiPanel: 'idle' | 'loading' | 'result' = 'idle';
  aiStreamText  = '';
  aiActionLabel = '';
  private aiSub: Subscription | null = null;

  // ── Fullscreen ─────────────────────────────────────────────────────────────
  isFullscreen = false;

  // ── File / project explorer ───────────────────────────────────────────────
  projectFiles:  ProjectFile[] = [];
  activeFilePath = '';
  sidebarOpen    = true;
  expandedDirs: Set<string> = new Set();

  // ── Angular iframe preview ───────────────────────────────────────────────
  @ViewChild('previewFrame') previewFrame!: ElementRef<HTMLIFrameElement>;
  showPreview = false;

  // ── Resizable output panel ───────────────────────────────────────────────
  outputHeight = 160;   // px
  private _resizing = false;
  private _resizeStartY = 0;
  private _resizeStartH = 0;
  private _resizeBound = this._onResizeMove.bind(this);
  private _resizeEndBound = this._onResizeEnd.bind(this);

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
  private pgRequestSub: Subscription | null = null;

  ngOnInit(): void {
    // Restore sidebar state from localStorage
    const savedSidebar = localStorage.getItem('pg_sidebarOpen');
    if (savedSidebar !== null) this.sidebarOpen = savedSidebar === 'true';

    // Initialise the project files from the default template (with 24h reset check).
    this.projectFiles   = this.selectedTemplate.createFiles();
    const entry         = this.projectFiles.find(f => f.path === this.selectedTemplate.entryFile)
                          ?? this.projectFiles[0];
    this.activeFilePath = entry.path;
    this.expandedDirs   = this._allDirs(this.projectFiles);

    // 24h auto-reset: if last-run was >24h ago, wipe and reload fresh template.
    const lastReset = parseInt(localStorage.getItem('pg_lastReset') ?? '0', 10);
    if (Date.now() - lastReset > 24 * 60 * 60 * 1000) {
      localStorage.setItem('pg_lastReset', Date.now().toString());
      // files already freshly created from template above — nothing else needed
    } else {
      // Restore persisted code for current template
      this._restoreFromStorage();
    }

    // Subscribe to Try Now / Open-in-Playground requests.
    this.pgRequestSub = this.pgSvc.request$.subscribe(req => {
      if (!req) return;
      if (this.editor) {
        this.applyRequest(req);
      } else {
        const t = this.langToTemplate(req.language);
        if (t) this.selectedTemplate = t;
        this.pendingRequest = req;
      }
    });
  }

  /** Persist current project files' code to localStorage. */
  private _saveToStorage(): void {
    try {
      const key = `pg_code_${this.selectedTemplate.id}`;
      const data = this.projectFiles.map(f => ({ path: f.path, code: f.code }));
      localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem('pg_lastReset', localStorage.getItem('pg_lastReset') ?? Date.now().toString());
    } catch { /* storage full — ignore */ }
  }

  /** Restore code from localStorage for the current template. */
  private _restoreFromStorage(): void {
    try {
      const key  = `pg_code_${this.selectedTemplate.id}`;
      const raw  = localStorage.getItem(key);
      if (!raw) return;
      const data: { path: string; code: string }[] = JSON.parse(raw);
      for (const saved of data) {
        const f = this.projectFiles.find(p => p.path === saved.path);
        if (f) f.code = saved.code;
      }
    } catch { /* corrupt storage — ignore */ }
  }

  /** Map old language IDs (from PlaygroundService) to the new template system. */
  private langToTemplate(langId: string): ProjectTemplate | null {
    const map: Record<string, ProjectTemplate['id']> = {
      javascript: 'javascript',
      typescript: 'typescript',
      csharp:     'csharp',
      sql:        'sql',
    };
    const id = map[langId];
    return id ? (TEMPLATES.find(t => t.id === id) ?? null) : null;
  }

  /** Compute all unique directory paths from a list of files. */
  private _allDirs(files: ProjectFile[]): Set<string> {
    const dirs = new Set<string>();
    for (const f of files) {
      const parts = f.path.split('/');
      for (let i = 1; i < parts.length; i++) {
        dirs.add(parts.slice(0, i).join('/'));
      }
    }
    return dirs;
  }

  /** Apply a PlaygroundRequest once Monaco is ready. */
  private applyRequest(req: PlaygroundRequest): void {
    const t = this.langToTemplate(req.language) ?? this.selectedTemplate;
    this.selectedTemplate = t;
    this.projectFiles     = t.createFiles();
    this.expandedDirs     = this._allDirs(this.projectFiles);
    const entry = this.projectFiles.find(f => f.path === t.entryFile) ?? this.projectFiles[0];
    entry.code          = req.code;
    this.activeFilePath = entry.path;
    if (this.editor && (window as any).monaco) {
      const model = this.editor.getModel();
      if (model) (window as any).monaco.editor.setModelLanguage(model, entry.monacoLang);
      this.editor.setValue(req.code);
      this.editor.focus();
    }
    this.pgSvc.clear();
    this.pendingRequest = null;
    this.clearOutput();
    this.cdr.detectChanges();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeydown(e: KeyboardEvent): void {
    if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); this.runCode(); }
    if (e.ctrlKey && e.key === 's')     { e.preventDefault(); this._saveToStorage(); }
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
      value:    this.activeFile?.code ?? this.projectFiles[0]?.code ?? '',
      language: this.activeFile?.monacoLang ?? this.projectFiles[0]?.monacoLang ?? 'javascript',
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

    // Apply any pending request that arrived before Monaco was ready
    if (this.pendingRequest) {
      this.applyRequest(this.pendingRequest);
    }
  }

  // ── Template / project switching ─────────────────────────────────────────
  selectTemplate(t: ProjectTemplate): void {
    if (this.selectedTemplate.id === t.id) return;
    // Persist current file's editor content before switching
    if (this.editor) {
      const cur = this.activeFile;
      if (cur) cur.code = this.editor.getValue();
    }
    this.selectedTemplate = t;
    this.projectFiles     = t.createFiles();
    this.expandedDirs     = this._allDirs(this.projectFiles);
    const entry = this.projectFiles.find(f => f.path === t.entryFile) ?? this.projectFiles[0];
    this.activeFilePath = entry.path;
    if (this.editor && (window as any).monaco) {
      const model = this.editor.getModel();
      if (model) (window as any).monaco.editor.setModelLanguage(model, entry.monacoLang);
      this.editor.setValue(entry.code);
    }
    this.clearOutput();
    this.clearAi();
    this.stdinText = '';
    this.stdinOpen = false;
  }

  get currentCode(): string {
    return this.editor ? this.editor.getValue() : '';
  }

  copyCode(): void {
    navigator.clipboard.writeText(this.currentCode).catch(() => {});
  }

  resetCode(): void {
    // Recreate fresh project files from the template, wipe storage, reload entry file.
    this.projectFiles   = this.selectedTemplate.createFiles();
    this.expandedDirs   = this._allDirs(this.projectFiles);
    localStorage.removeItem(`pg_code_${this.selectedTemplate.id}`);
    localStorage.setItem('pg_lastReset', Date.now().toString());
    const entry         = this.projectFiles.find(f => f.path === this.selectedTemplate.entryFile)
                          ?? this.projectFiles[0];
    this.activeFilePath = entry.path;
    if (this.editor && (window as any).monaco) {
      const model = this.editor.getModel();
      if (model) (window as any).monaco.editor.setModelLanguage(model, entry.monacoLang);
      this.editor.setValue(entry.code);
    }
    this.clearOutput();
    this.clearAi();
    this.showPreview = false;
  }

  // ── Code execution ────────────────────────────────────────────────────────
  runCode(): void {
    const code = this.currentCode.trim();

    // Guard: editor not ready
    if (!this.editor) {
      this.clearOutput();
      this.addOutput('⚠️ Editor is still loading. Please wait a moment.', 'warn');
      this.cdr.detectChanges();
      return;
    }

    // Guard: empty code
    if (!code) {
      this.clearOutput();
      this.addOutput('⚠️ Nothing to run — write some code first.', 'warn');
      this.cdr.detectChanges();
      return;
    }

    // Guard: code size (8KB hard limit for Judge0/Roslyn)
    if (code.length > 8 * 1024) {
      this.clearOutput();
      this.addOutput(`❌ Code is too large (${(code.length / 1024).toFixed(1)} KB). The limit is 8 KB.`, 'error');
      this.cdr.detectChanges();
      return;
    }

    this.clearOutput();
    this.isRunning = true;
    this.execStatus = 'idle';
    this.execStatusMsg = '';
    this.execTime = '';

    // Always run the project's entry file, not just the active (viewed) file.
    // First, flush current editor content back to the active file object.
    const activeF = this.activeFile;
    if (activeF) activeF.code = code;
    this._saveToStorage();   // auto-save on every run
    const entry     = this.projectFiles.find(f => f.path === this.selectedTemplate.entryFile);
    const entryCode = (entry?.code ?? code).trim();
    if (!entryCode) {
      this.addOutput('⚠️ Entry file is empty — write some code first.', 'warn');
      this.isRunning = false;
      this.cdr.detectChanges();
      return;
    }

    this.showPreview = false;   // hide old preview before new run

    switch (this.selectedTemplate.runAs) {
      case 'javascript': this.runJavaScript(entryCode); break;
      case 'typescript': void this.runTs(entryCode); break;
      case 'csharp':     this.runSandbox('csharp', entryCode); break;
      case 'sql':        void this.runSql(entryCode); break;
    }
    this.cdr.detectChanges();
  }

  retryCode(): void {
    this.runCode();
  }

  private runSandbox(language: string, code: string): void {
    this.addOutput(`⏳ Running ${this.selectedTemplate.label}…`, 'info');
    this.cdr.detectChanges();

    // /api/playground/run: Roslyn for C#, Judge0 for JS/TS/Python/Java/Go/Rust.
    // Use the same hostname-aware URL pattern for consistent local+prod behaviour.
    const apiBase = window.location.hostname === 'localhost' ? '' : 'https://learnwithai.tech';
    const url     = `${apiBase}/api/playground/run`;
    const body    = { language, code, stdin: this.stdinText };

    // Live elapsed-time ticker shown while waiting for the sandbox
    let elapsed = 0;
    const ticker = setInterval(() => {
      elapsed++;
      const idx = this.outputLines.findIndex(l => l.text.startsWith('⏳'));
      if (idx !== -1) {
        this.outputLines[idx] = { text: `⏳ Running ${this.selectedTemplate.label}… ${elapsed}s`, type: 'info' };
        this.cdr.markForCheck();
      }
    }, 1000);

    this.http.post<{
      stdout: string; stderr: string; compileOutput: string;
      executionTime: string; status: string; success: boolean; engine?: string;
    }>(url, body).subscribe({
      next: res => {
        clearInterval(ticker);
        // Remove the spinner line
        this.outputLines = this.outputLines.filter(l => !l.text.startsWith('⏳'));

        if (res.stdout) {
          res.stdout.split('\n').filter(Boolean).forEach(line =>
            this.addOutput(line, 'log'));
        }

        // Show any compilation or runtime error output
        const hasError = !!res.stderr || (!!res.compileOutput && !res.success);
        if (res.stderr) {
          res.stderr.split('\n').filter(Boolean).forEach(line =>
            this.addOutput(line, 'error'));
        } else if (res.compileOutput && !res.success) {
          res.compileOutput.split('\n').filter(Boolean).forEach(line =>
            this.addOutput(line, 'error'));
        }

        // No output at all → friendly hint
        if (!res.stdout && !res.stderr && !res.compileOutput && res.success) {
          this.addOutput('(No output — add Console.WriteLine() or print() to see results)', 'info');
        }

        const statusText     = res.status ?? 'Unknown';
        const isInternalErr  = statusText.toLowerCase().includes('internal');
        if (isInternalErr && !res.stderr && !res.compileOutput) {
          this.addOutput('❌ Sandbox Internal Error — this is a server-side environment issue.', 'error');
          this.addOutput('💡 Click Retry to try again, or switch to a different language.', 'info');
        }

        this.execStatus    = res.success ? 'success' : 'error';
        this.execStatusMsg = statusText;
        this.execTime      = res.executionTime ?? '';
        this.isRunning     = false;
        this.cdr.detectChanges();
        setTimeout(() => this.scrollOutput(), 50);
      },
      error: err => {
        clearInterval(ticker);
        this.outputLines = this.outputLines.filter(l => !l.text.startsWith('⏳'));

        const status   = err.status ?? 0;
        const errBody  = err.error?.error ?? err.error?.Error ?? err.error?.message ?? '';
        let   msg: string;

        if (status === 0) {
          msg = '❌ Cannot reach the backend. Make sure the API server is running.\n'
              + '💡 Check your connection or try again in a few seconds.';
        } else if (status === 400) {
          msg = `❌ Bad request: ${errBody || 'Invalid code or language.'}`;
        } else if (status === 429) {
          msg = '⏳ Too many requests. Please wait a moment and try again.';
        } else if (status >= 500) {
          msg = `❌ Server error (${status}). ${errBody || 'Please try again.'}`;
        } else {
          msg = `❌ Error (${status}): ${errBody || err.message || 'Unknown error'}`;
        }

        msg.split('\n').forEach(line => this.addOutput(line, 'error'));
        this.execStatus    = 'error';
        this.execStatusMsg = `Error ${status || 'network'}`;
        this.isRunning     = false;
        this.cdr.detectChanges();
        setTimeout(() => this.scrollOutput(), 50);
      },
    });
  }

  // ── Multi-file require() mock ─────────────────────────────────────────────
  /**
   * Builds a self-contained `require()` function injected at the top of every
   * JavaScript/Node.js run.  It handles:
   *   • Local file imports  (e.g. require('./utils'))
   *   • Express mock        (full route registration + GET / simulation)
   *   • Angular CDN mocks   (decorators as identity functions)
   */
  private buildRequireMock(): string {
    // All JS/TS project files become importable modules keyed by their path
    // without the extension: 'utils.js' → './utils', 'routes/users.js' → './routes/users'
    const localEntries = this.projectFiles
      .filter(f => ['javascript', 'typescript'].includes(f.monacoLang))
      .map(f => {
        const key = './' + f.path.replace(/\.[jt]s$/, '');
        return '  ' + JSON.stringify(key) + ': ' + JSON.stringify(f.code);
      })
      .join(',\n');

    return (
      'var __files = {\n' + localEntries + '\n};\n' +
      'var __cache = {};\n' +
      'function require(mod) {\n' +
      '  if (__cache[mod]) return __cache[mod];\n' +
      // ── Angular mocks ────────────────────────────────────────────────────
      '  var _id = function() { return function(t) { return t; }; };\n' +
      '  if (mod === "@angular/core") return {\n' +
      '    Component: _id, NgModule: _id, Injectable: _id, Pipe: _id, Directive: _id,\n' +
      '    Input: _id, Output: _id, HostListener: _id, ViewChild: _id,\n' +
      '    EventEmitter: function() { this._h=[]; this.emit=function(v){this._h.forEach(function(h){h(v);})}; this.subscribe=function(h){this._h.push(h);}; },\n' +
      '    OnInit: function(){}, OnDestroy: function(){}, OnChanges: function(){},\n' +
      '    ChangeDetectionStrategy: { OnPush: 0, Default: 1 },\n' +
      '  };\n' +
      '  if (mod === "@angular/common")         return { CommonModule: {}, NgIf: {}, NgFor: {}, AsyncPipe: {} };\n' +
      '  if (mod === "@angular/forms")          return { FormsModule: {}, ReactiveFormsModule: {}, FormControl: function(){this.value="";}, FormGroup: function(){} };\n' +
      '  if (mod === "@angular/router")         return { RouterModule: {}, Router: function(){}, ActivatedRoute: function(){} };\n' +
      '  if (mod === "@angular/platform-browser") return { BrowserModule: {} };\n' +
      // ── Express mock ─────────────────────────────────────────────────────
      '  if (mod === "express") {\n' +
      '    function mkApp() {\n' +
      '      var _r = [];\n' +
      '      var app = {\n' +
      '        get:    function(p,cb) { _r.push({m:"GET",   p:p,cb:cb}); return app; },\n' +
      '        post:   function(p,cb) { _r.push({m:"POST",  p:p,cb:cb}); return app; },\n' +
      '        put:    function(p,cb) { _r.push({m:"PUT",   p:p,cb:cb}); return app; },\n' +
      '        delete: function(p,cb) { _r.push({m:"DELETE",p:p,cb:cb}); return app; },\n' +
      '        use:    function(p,mw) {\n' +
      '          if (typeof mw === "undefined" && typeof p === "function") return app;\n' +
      '          if (typeof mw === "object" && mw._r) {\n' +
      '            mw._r.forEach(function(r){ _r.push({m:r.m, p:(p==="/"?"":p)+r.p, cb:r.cb}); });\n' +
      '          }\n' +
      '          return app;\n' +
      '        },\n' +
      '        listen: function(port, cb) {\n' +
      '          if (cb) cb();\n' +
      '          console.log("[Express] Listening on port " + port);\n' +
      '          console.log("[Express] Registered routes:");\n' +
      '          _r.forEach(function(r){ console.log("  " + r.m + " " + r.p); });\n' +
      '          var root = _r.find(function(r){ return r.m==="GET" && r.p==="/"; });\n' +
      '          if (root) {\n' +
      '            var res = { json: function(d){ console.log("[Express] GET / →", JSON.stringify(d,null,2)); }, send: function(d){ console.log("[Express] GET / →", String(d)); }, status: function(){ return res; } };\n' +
      '            root.cb({ params:{}, query:{}, body:{} }, res);\n' +
      '          }\n' +
      '          return app;\n' +
      '        },\n' +
      '        _r: _r,\n' +
      '      };\n' +
      '      return app;\n' +
      '    }\n' +
      '    var express = function() { return mkApp(); };\n' +
      '    express.Router = function() { return mkApp(); };\n' +
      '    express.json   = function() { return function(q,r,n){ if(n)n(); }; };\n' +
      '    __cache["express"] = express;\n' +
      '    return express;\n' +
      '  }\n' +
      // ── Local project files ───────────────────────────────────────────────
      '  if (__files[mod] !== undefined) {\n' +
      '    var exports = {};\n' +
      '    var module  = { exports: exports };\n' +
      '    var fn = new Function("require","exports","module", __files[mod]);\n' +
      '    fn(require, exports, module);\n' +
      '    __cache[mod] = module.exports;\n' +
      '    return module.exports;\n' +
      '  }\n' +
      '  console.warn("[require] Module not found: " + mod);\n' +
      '  return {};\n' +
      '}'
    );
  }

  // ── Angular runner (iframe preview) ─────────────────────────────────────
  /**
   * Renders the Angular project as a live HTML preview in an iframe.
   *
   * Strategy (honest, lightweight, no fake CLI):
   *   1. Grab app.component.html, app.component.css, app.component.ts.
   *   2. Compile TS → JS in-browser with the TS CDN.
   *   3. Inject compiled JS into the iframe alongside the HTML template and CSS.
   *   4. Run basic Angular simulation: instantiate AppComponent, call ngOnInit(),
   *      and render ng-template directives (*ngFor, *ngIf, {{ interpolation }}).
   *   5. Capture console.* calls from the iframe and forward them to the output panel.
   */
  private async runAngular(tsCode: string): Promise<void> {
    this.isRunning = true;
    this.addOutput('⏳ Compiling TypeScript…', 'info');
    this.cdr.detectChanges();
    try {
      await this.ensureTsCompiler();
      const ts     = (window as any).ts;
      const result = ts.transpileModule(tsCode, {
        compilerOptions: {
          module:                 ts.ModuleKind.None,
          target:                 ts.ScriptTarget.ES2015,
          experimentalDecorators: true,
          strict:                 false,
          noEmitOnError:          false,
        },
        reportDiagnostics: true,
      });

      // Surface TS diagnostics (skip missing @angular/* — expected in-browser)
      if (result.diagnostics?.length) {
        result.diagnostics.forEach((d: any) => {
          const msg = typeof d.messageText === 'string'
            ? d.messageText : d.messageText?.messageText ?? String(d.messageText);
          if (!msg.toLowerCase().includes('cannot find module') &&
              !msg.toLowerCase().includes('cannot find name')) {
            this.addOutput('⚠️ TS: ' + msg, 'warn');
          }
        });
      }
      this.outputLines = this.outputLines.filter(l => !l.text.startsWith('⏳'));

      // Collect template + css from project files
      const htmlFile = this.projectFiles.find(f => f.monacoLang === 'html');
      const cssFile  = this.projectFiles.find(f => f.monacoLang === 'css');
      const htmlCode = htmlFile?.code ?? '<p>No template found.</p>';
      const cssCode  = cssFile?.code  ?? '';

      // Build the iframe document
      const iframeDoc = this._buildAngularIframe(result.outputText, htmlCode, cssCode);

      // Write into the preview iframe
      const iframe = this.previewFrame?.nativeElement;
      if (iframe) {
        // Listen for console messages forwarded from iframe
        const msgHandler = (ev: MessageEvent) => {
          if (ev.source !== iframe.contentWindow) return;
          const d = ev.data;
          if (d?.type === 'console') {
            this.addOutput(d.text, d.level ?? 'log');
            this.cdr.markForCheck();
          }
        };
        window.addEventListener('message', msgHandler);
        iframe.srcdoc = iframeDoc;
        // Cleanup listener after 5s (enough for init)
        setTimeout(() => window.removeEventListener('message', msgHandler), 5000);
      }

      this.showPreview   = true;
      this.execTime      = '';
      this.execStatus    = 'success';
      this.execStatusMsg = 'Preview rendered';
    } catch (err: any) {
      this.outputLines = this.outputLines.filter(l => !l.text.startsWith('⏳'));
      this.addOutput('❌ TypeScript: ' + (err?.message ?? String(err)), 'error');
      this.execStatus    = 'error';
      this.execStatusMsg = 'Compile error';
    }
    this.isRunning = false;
    this.cdr.detectChanges();
  }

  /**
   * Build a fully self-contained HTML document for the Angular preview iframe.
   * Includes a micro Angular simulator that handles:
   *   - {{ interpolation }}
   *   - *ngFor="let item of items"
   *   - *ngIf="expr"
   *   - (click) event bindings
   */
  private _buildAngularIframe(compiledJs: string, template: string, css: string): string {
    // Escape backticks/$ in user strings for safe template-literal injection
    const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { margin: 0; font-family: Arial, sans-serif; background: #fff; color: #1a1a1a; }
  ${css}
</style>
</head>
<body>
<div id="app-root"></div>
<script>
/* ── Console bridge → parent window ─────────────────────────── */
(function() {
  var _orig = { log: console.log, info: console.info, warn: console.warn, error: console.error };
  ['log','info','warn','error'].forEach(function(k) {
    console[k] = function() {
      var args = Array.prototype.slice.call(arguments);
      var text = args.map(function(a) {
        if (a === null) return 'null';
        if (a === undefined) return 'undefined';
        if (typeof a === 'object') { try { return JSON.stringify(a, null, 2); } catch(e) { return String(a); } }
        return String(a);
      }).join(' ');
      parent.postMessage({ type: 'console', level: k === 'error' ? 'error' : k, text: text }, '*');
      _orig[k].apply(console, arguments);
    };
  });
})();

/* ── Micro Angular simulator ────────────────────────────── */
(function() {
  // Identity decorator factories (no-op in browser)
  function _id() { return function(t) { return t; }; }
  var Component = _id, NgModule = _id, Injectable = _id, Directive = _id, Pipe = _id;
  var Input = _id, Output = _id, HostListener = _id, ViewChild = _id;
  function EventEmitter() { this._h = []; }
  EventEmitter.prototype.emit      = function(v) { this._h.forEach(function(h){h(v);}); };
  EventEmitter.prototype.subscribe = function(h) { this._h.push(h); };
  var OnInit = {}, OnDestroy = {}, OnChanges = {};
  var ChangeDetectionStrategy = { OnPush: 0, Default: 1 };

  /* ── Compile & run user code ─────────────────────────── */
  try {
${compiledJs}
  } catch(e) {
    console.error('[Angular] Compile/init error: ' + e);
  }

  /* ── Instantiate AppComponent ────────────────────────── */
  var component = null;
  try {
    var Ctor = (typeof AppComponent !== 'undefined') ? AppComponent : null;
    if (!Ctor) { document.getElementById('app-root').innerHTML = '<p style="color:red">AppComponent not found. Make sure you export class AppComponent.</p>'; return; }
    component = new Ctor();
    if (typeof component.ngOnInit === 'function') component.ngOnInit();
  } catch(e) {
    console.error('[Angular] ngOnInit error: ' + e);
  }

  /* ── Mini template renderer ──────────────────────────────────────────── */
  var template = \`${esc(template)}\`;

  function evalExpr(expr, ctx) {
    try {
      var keys = Object.keys(ctx);
      var vals = keys.map(function(k) { return ctx[k]; });
      return (new Function(keys, 'return (' + expr + ')')).apply(ctx, vals);
    } catch(e) { return ''; }
  }

  function render(tmpl, ctx) {
    var el = document.createElement('div');
    el.innerHTML = tmpl;

    // Process *ngFor
    el.querySelectorAll('[\\\\*ngFor]').forEach(function(node) {
      var expr = node.getAttribute('*ngFor');
      var m = expr.match(/let\\\\s+(\\\\w+)\\\\s+of\\\\s+(.+)/);
      if (!m) return;
      var varName = m[1], listExpr = m[2].trim();
      var list = evalExpr(listExpr, ctx);
      if (!Array.isArray(list)) return;
      var parent = node.parentNode;
      var ref = document.createComment('ngFor');
      parent.replaceChild(ref, node);
      list.forEach(function(item, i) {
        var childCtx = Object.assign({}, ctx);
        childCtx[varName] = item;
        childCtx['\\$index'] = i;
        var clone = node.cloneNode(true);
        clone.removeAttribute('*ngFor');
        var rendered = render(clone.outerHTML, childCtx);
        var tmp = document.createElement('div');
        tmp.innerHTML = rendered;
        parent.insertBefore(tmp.firstChild, ref);
      });
      parent.removeChild(ref);
    });

    // Process *ngIf
    el.querySelectorAll('[\\\\*ngIf]').forEach(function(node) {
      var expr = node.getAttribute('*ngIf');
      if (!evalExpr(expr, ctx)) node.parentNode.removeChild(node);
      else node.removeAttribute('*ngIf');
    });

    // {{ interpolation }}
    function interpolate(text, ctx) {
      return text.replace(/\\\\{\\\\{\\\\s*([^}]+?)\\\\s*\\\\}\\\\}/g, function(_, expr) {
        var val = evalExpr(expr.trim(), ctx);
        return val === null || val === undefined ? '' : String(val);
      });
    }
    function walkText(node) {
      if (node.nodeType === 3) {
        node.textContent = interpolate(node.textContent, ctx);
      } else {
        node.childNodes.forEach(walkText);
      }
    }
    walkText(el);

    return el.innerHTML;
  }

  /* ── Mount + bind events ─────────────────────────────────────────────── */
  function mount() {
    var root = document.getElementById('app-root');
    var ctx = component || {};
    root.innerHTML = render(template, ctx);

    // Bind (click) events
    root.querySelectorAll('[\\\\(click\\\\)]').forEach(function(node) {
      var expr = node.getAttribute('(click)');
      node.removeAttribute('(click)');
      node.addEventListener('click', function(event) {
        try {
          var keys = Object.keys(ctx).concat(['event','\\$event']);
          var vals = Object.values(ctx).concat([event, event]);
          (new Function(keys, expr)).apply(ctx, vals);
          mount(); // re-render after state change
        } catch(e) { console.error('[Angular] click error: ' + e); }
      });
    });

    // Bind (keyup.enter) events
    root.querySelectorAll('[\\\\(keyup\\\\.enter\\\\)]').forEach(function(node) {
      var expr = node.getAttribute('(keyup.enter)');
      node.removeAttribute('(keyup.enter)');
      node.addEventListener('keyup', function(event) {
        if (event.key !== 'Enter') return;
        try {
          var keys = Object.keys(ctx).concat(['event','\\$event']);
          var vals = Object.values(ctx).concat([event, event]);
          (new Function(keys, expr)).apply(ctx, vals);
          mount();
        } catch(e) {}
      });
    });

    // Wire template variables (#ref)
    root.querySelectorAll('[\\\\#]').forEach(function(node) {
      Array.from(node.attributes).forEach(function(attr) {
        if (attr.name.startsWith('#')) {
          ctx[attr.name.slice(1)] = node;
        }
      });
    });
  }

  mount();
})();
</script>
</body>
</html>`;
  }

  // ── SQL runner ─────────────────────────────────────────────────────────────
  /** Seed the four predefined in-memory tables into AlaSQL. */
  private _seedSqlTables(alasql: any): void {
    const exec = (sql: string) => { try { alasql(sql); } catch (_) {} };

    exec('DROP TABLE IF EXISTS users');
    exec('CREATE TABLE users (id INT, name STRING, email STRING, age INT, city STRING)');
    ([
      [1, 'Alice',   'alice@example.com',   28, 'London'],
      [2, 'Bob',     'bob@example.com',     34, 'New York'],
      [3, 'Charlie', 'charlie@example.com', 22, 'Paris'],
      [4, 'Diana',   'diana@example.com',   30, 'London'],
      [5, 'Eve',     'eve@example.com',     26, 'Tokyo'],
      [6, 'Frank',   'frank@example.com',   41, 'Berlin'],
    ] as [number, string, string, number, string][]).forEach(([id, name, email, age, city]) =>
      exec(`INSERT INTO users VALUES (${id},'${name}','${email}',${age},'${city}')`)
    );

    exec('DROP TABLE IF EXISTS categories');
    exec('CREATE TABLE categories (id INT, name STRING)');
    ([
      [1, 'Electronics'],
      [2, 'Books'],
      [3, 'Clothing'],
      [4, 'Food'],
    ] as [number, string][]).forEach(([id, name]) =>
      exec(`INSERT INTO categories VALUES (${id},'${name}')`)
    );

    exec('DROP TABLE IF EXISTS products');
    exec('CREATE TABLE products (id INT, name STRING, category_id INT, price FLOAT, stock INT)');
    ([
      [1, 'Laptop',       1, 999.99,  50],
      [2, 'Headphones',   1, 199.99, 120],
      [3, 'Clean Code',   2,  35.00, 200],
      [4, 'TypeScript',   2,  29.99, 180],
      [5, 'T-Shirt',      3,  19.99, 500],
      [6, 'Jeans',        3,  59.99, 300],
      [7, 'Coffee Beans', 4,  14.99, 800],
      [8, 'Olive Oil',    4,  12.49, 400],
    ] as [number, string, number, number, number][]).forEach(([id, name, cat, price, stock]) =>
      exec(`INSERT INTO products VALUES (${id},'${name}',${cat},${price},${stock})`)
    );

    exec('DROP TABLE IF EXISTS orders');
    exec('CREATE TABLE orders (id INT, user_id INT, amount FLOAT, status STRING, created_at STRING)');
    ([
      [1, 1, 249.99, 'completed', '2024-01-10'],
      [2, 2,  99.99, 'pending',   '2024-01-12'],
      [3, 1, 499.99, 'completed', '2024-01-15'],
      [4, 3,  35.00, 'cancelled', '2024-01-18'],
      [5, 4, 179.99, 'completed', '2024-01-20'],
      [6, 5,  59.99, 'pending',   '2024-01-22'],
      [7, 2, 299.99, 'completed', '2024-01-25'],
      [8, 6,  14.99, 'completed', '2024-01-28'],
    ] as [number, number, number, string, string][]).forEach(([id, uid, amt, status, date]) =>
      exec(`INSERT INTO orders VALUES (${id},${uid},${amt},'${status}','${date}')`)
    );
  }

  /** Execute SQL using AlaSQL — runs entirely in the browser. */
  private async runSql(sqlCode: string): Promise<void> {
    this.isRunning = true;
    this.addOutput('⏳ Loading SQL engine…', 'info');
    this.cdr.detectChanges();
    try {
      await this.ensureAlaSQL();
      const alasql  = (window as any).alasql;
      this._seedSqlTables(alasql);
      this.outputLines = this.outputLines.filter(l => !l.text.startsWith('⏳'));
      const t0 = performance.now();

      const statements = sqlCode
        .replace(/--[^\n]*/g, '')   // strip line comments
        .split(';')
        .map(s => s.trim())
        .filter(Boolean);

      for (const stmt of statements) {
        try {
          const result = alasql(stmt);
          if (Array.isArray(result) && result.length > 0) {
            const cols = Object.keys(result[0]);
            const colW = cols.map(c =>
              Math.max(c.length, ...result.map((r: any) => String(r[c] ?? '').length)));
            const row2str = (r: any) =>
              cols.map((c, i) => String(r[c] ?? '').padEnd(colW[i])).join('  │  ');
            this.addOutput(cols.map((c, i) => c.padEnd(colW[i])).join('  │  '), 'info');
            this.addOutput(colW.map(w => '─'.repeat(w + 4)).join('┼'), 'info');
            result.forEach((r: any) => this.addOutput(row2str(r), 'log'));
            this.addOutput(`(${result.length} row${result.length !== 1 ? 's' : ''})`, 'info');
          } else if (Array.isArray(result) && result.length === 0) {
            this.addOutput('(0 rows)', 'info');
          } else if (typeof result === 'number') {
            this.addOutput(`${result} row(s) affected`, 'log');
          }
        } catch (e: any) {
          this.addOutput('❌ SQL: ' + (e.message ?? String(e)), 'error');
        }
      }
      const ms = (performance.now() - t0).toFixed(1);
      this.execTime      = `${ms}ms`;
      this.execStatus    = 'success';
      this.execStatusMsg = `Completed in ${ms}ms`;
    } catch (err: any) {
      this.outputLines = this.outputLines.filter(l => !l.text.startsWith('⏳'));
      this.addOutput('❌ SQL engine: ' + (err?.message ?? String(err)), 'error');
      this.execStatus    = 'error';
      this.execStatusMsg = 'SQL engine error';
    }
    this.isRunning = false;
    this.cdr.detectChanges();
  }

  private ensureAlaSQL(): Promise<void> {
    if ((window as any).alasql) return Promise.resolve();
    if (this.sqlEngineLoading)  return this.sqlEngineLoading;
    this.sqlEngineLoading = new Promise<void>((resolve, reject) => {
      const s     = document.createElement('script');
      s.src       = 'https://cdnjs.cloudflare.com/ajax/libs/alasql/3.1.0/alasql.min.js';
      s.onload    = () => { this.sqlEngineLoading = null; resolve(); };
      s.onerror   = () => { this.sqlEngineLoading = null; reject(new Error('Failed to load SQL engine. Check your connection.')); };
      document.head.appendChild(s);
    });
    return this.sqlEngineLoading;
  }

  /** Run JavaScript using a Web Worker — captures console output with 10s timeout. */
  private runJavaScript(code: string): void {
    this.isRunning = true;
    this.addOutput('⏳ Running JavaScript…', 'info');
    this.cdr.detectChanges();
    // Strip the loading line once worker posts first message
    const origOnMessage = (data: any) => {
      if (data?.t !== undefined) {
        this.outputLines = this.outputLines.filter(l => !l.text.startsWith('⏳'));
      }
    };
    // Use the existing Web Worker runner
    // Wrap to clear the spinner line on first output
    const fullCode = this.buildRequireMock() + '\n' + code;
    this.outputLines = this.outputLines.filter(l => !l.text.startsWith('⏳'));
    this.runJsInWorker(fullCode);
  }

  /** Run JavaScript in a dedicated Web Worker — isolated scope, 10s timeout. */
  private runJsInWorker(jsCode: string): void {
    // Worker template: custom console + try/catch wrapper.
    // The worker has no access to window, document, or this component's scope.
    // ⚠️ We use string concatenation, NOT a template literal, to build the source
    //    so that backticks and ${...} inside user code don't break the source string.
    // ⚠️ We wrap user code in async function + await so that Promise .then() callbacks
    //    (microtasks) fully drain BEFORE "done" is posted — otherwise worker.terminate()
    //    would discard log messages queued by .then() after the sync try block finished.
    const workerSrc =
      // Catch unhandled rejections (e.g. rejected Promise with no .catch)
      'self.addEventListener(\'unhandledrejection\', function(e) {\n' +
      '  postMessage({ t: \'err\', v: \'Unhandled rejection: \' + String(e.reason ?? e) });\n' +
      '});\n' +
      'const _ser = function(v) {\n' +
      '  if (v === null)      return \'null\';\n' +
      '  if (v === undefined) return \'undefined\';\n' +
      '  if (typeof v === \'object\') { try { return JSON.stringify(v, null, 2); } catch(x) { return String(v); } }\n' +
      '  return String(v);\n' +
      '};\n' +
      'var console = {\n' +
      '  log:   function() { postMessage({ t: \'log\',  v: [].slice.call(arguments).map(_ser).join(\' \') }); },\n' +
      '  info:  function() { postMessage({ t: \'info\', v: [].slice.call(arguments).map(_ser).join(\' \') }); },\n' +
      '  warn:  function() { postMessage({ t: \'warn\', v: [].slice.call(arguments).map(_ser).join(\' \') }); },\n' +
      '  error: function() { postMessage({ t: \'err\',  v: [].slice.call(arguments).map(_ser).join(\' \') }); },\n' +
      '};\n' +
      // Async IIFE: awaiting the inner async function drains the microtask queue,
      // ensuring .then() callbacks post their log messages BEFORE "done" is posted.
      '(async function __run() {\n' +
      '  try {\n' +
      '    await (async function() {\n' +
      jsCode + '\n' +
      '    })();\n' +
      '    postMessage({ t: \'done\' });\n' +
      '  } catch (e) {\n' +
      '    postMessage({ t: \'err\', v: String(e) });\n' +
      '  }\n' +
      '})();\n';
    const blob    = new Blob([workerSrc], { type: 'text/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    const worker  = new Worker(blobUrl);
    const t0      = performance.now();

    const timeoutId = setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(blobUrl);
      this.outputLines = this.outputLines.filter(l => !l.text.startsWith('⏳'));
      this.addOutput('❌ Execution timed out (10 s). Possible infinite loop?', 'error');
      this.execStatus    = 'error';
      this.execStatusMsg = 'Timeout after 10s';
      this.isRunning     = false;
      this.cdr.detectChanges();
    }, 10_000);

    worker.onmessage = ({ data }) => {
      const typeMap: Record<string, 'log' | 'info' | 'warn' | 'error'> =
        { log: 'log', info: 'info', warn: 'warn', err: 'error' };

      if (data.t === 'done') {
        clearTimeout(timeoutId);
        worker.terminate();
        URL.revokeObjectURL(blobUrl);
        const ms = (performance.now() - t0).toFixed(1);
        this.execTime      = `${ms}ms`;
        this.execStatus    = 'success';
        this.execStatusMsg = `Completed in ${ms}ms`;
        this.isRunning     = false;
        this.cdr.detectChanges();
        setTimeout(() => this.scrollOutput(), 50);
      } else if (data.t === 'err') {
        clearTimeout(timeoutId);
        worker.terminate();
        URL.revokeObjectURL(blobUrl);
        const ms = (performance.now() - t0).toFixed(1);
        this.addOutput(`❌ ${data.v}`, 'error');
        this.execTime      = `${ms}ms`;
        this.execStatus    = 'error';
        this.execStatusMsg = (data.v as string)?.split('\n')[0] ?? 'Runtime error';
        this.isRunning     = false;
        this.cdr.detectChanges();
        setTimeout(() => this.scrollOutput(), 50);
      } else {
        this.addOutput(data.v ?? '', typeMap[data.t] ?? 'log');
        this.cdr.markForCheck();
      }
    };

    worker.onerror = (e) => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(blobUrl);
      this.addOutput(`❌ ${e.message ?? 'Worker error'}`, 'error');
      this.execStatus    = 'error';
      this.execStatusMsg = 'Worker error';
      this.isRunning     = false;
      this.cdr.detectChanges();
    };
  }

  /** Compile TypeScript in the browser via the TS compiler CDN, then run as JS. */
  private async runTs(code: string): Promise<void> {
    this.isRunning = true;   // disable Run button while CDN loads / compiles
    this.addOutput('⏳ Compiling TypeScript…', 'info');
    this.cdr.detectChanges();
    try {
      await this.ensureTsCompiler();
      const ts     = (window as any).ts;
      const result = ts.transpileModule(code, {
        compilerOptions: {
          module:    ts.ModuleKind.None,
          target:    ts.ScriptTarget.ES2020,
          strict:    false,
          noEmitOnError: false,
        },
        reportDiagnostics: true,
      });
      // Surface type errors as warnings (transpilation still succeeds)
      if (result.diagnostics?.length) {
        result.diagnostics.forEach((d: any) => {
          const msg = typeof d.messageText === 'string'
            ? d.messageText
            : d.messageText?.messageText ?? String(d.messageText);
          this.addOutput(`⚠️ TS: ${msg}`, 'warn');
        });
      }
      this.outputLines = this.outputLines.filter(l => !l.text.startsWith('⏳'));
      this.runJsInWorker(result.outputText);
    } catch (err: any) {
      this.outputLines = this.outputLines.filter(l => !l.text.startsWith('⏳'));
      this.addOutput(`❌ TypeScript: ${err?.message ?? String(err)}`, 'error');
      this.execStatus    = 'error';
      this.execStatusMsg = 'Compile error';
      this.isRunning     = false;
      this.cdr.detectChanges();
    }
  }

  /** Lazily load the TypeScript compiler from CDN (cached after first load). */
  private ensureTsCompiler(): Promise<void> {
    if ((window as any).ts) return Promise.resolve();
    if (this.tsCompilerLoading)   return this.tsCompilerLoading;
    this.tsCompilerLoading = new Promise<void>((resolve, reject) => {
      const s  = document.createElement('script');
      s.id     = 'ts-compiler-cdn';
      s.src    = 'https://cdnjs.cloudflare.com/ajax/libs/typescript/5.4.5/typescript.min.js';
      s.onload = () => { this.tsCompilerLoading = null; resolve(); };
      s.onerror = () => {
        this.tsCompilerLoading = null;
        reject(new Error('Failed to load TypeScript compiler. Check your connection.'));
      };
      document.head.appendChild(s);
    });
    return this.tsCompilerLoading;
  }

  private addOutput(text: string, type: 'log' | 'error' | 'info' | 'warn' = 'log'): void {
    this.outputLines.push({ text, type });
  }

  clearOutputBtn(): void {
    this.outputLines = [];
    this.execStatus = 'idle';
    this.execStatusMsg = '';
    this.execTime = '';
  }

  private clearOutput(): void {
    this.outputLines = [];
    this.execStatus = 'idle';
    this.execStatusMsg = '';
    this.execTime = '';
  }

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
    if (!code) {
      this.clearAi();
      this.aiPanel       = 'result';
      this.aiStreamText  = '⚠️ Write some code first, then use an AI action.';
      this.cdr.detectChanges();
      return;
    }

    const labels: Record<string, string> = {
      explain:  '💡 Explaining Code',
      improve:  '✨ Improving Code',
      bugs:     '🔍 Analysing Bugs',
      tests:    '🧪 Generating Tests',
      refactor: '🔧 Refactoring Code',
      comments: '💬 Adding Comments',
      convert:  '🔄 Converting Language',
      optimize: '⚡ Optimising Performance',
      exercise: '🎯 Generating Exercise',
    };

    this.clearAi();
    this.aiPanel       = 'loading';
    this.aiActionLabel = labels[action] + '…';
    this.aiSub?.unsubscribe();

    const prompt = this.AI_PROMPTS[action](code, this.selectedTemplate.label);

    this.aiSub = this.aiSvc.getOllamaExplanation(prompt).subscribe({
      next: res => {
        this.aiStreamText = res.explanation;
        if (res.done) {
          this.aiPanel       = 'result';
          this.aiActionLabel = labels[action];   // drop the "…" on completion
        }
        this.cdr.detectChanges();
        this.scrollAiPanel();
      },
      error: () => {
        this.aiPanel       = 'result';
        this.aiActionLabel = labels[action];
        this.aiStreamText  = '⚠️ AI response failed. Check your connection and try again.';
        this.cdr.detectChanges();
      },
      complete: () => {
        this.aiPanel       = 'result';
        this.aiActionLabel = labels[action];
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

    const lang    = this.selectedTemplate.label;
    const aiPart  = this.aiStreamText.trim()
      ? `\n\n---\n### 🤖 AI Analysis\n\n${this.aiStreamText.trim()}`
      : '';
    const content = `## ${lang} Code\n\n\`\`\`${this.activeFile?.monacoLang ?? 'text'}\n${code}\n\`\`\`${aiPart}`;

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

  // ── Sidebar / file explorer ────────────────────────────────────────────────

  /** The file currently open in Monaco. */
  get activeFile(): ProjectFile | undefined {
    return this.projectFiles.find(f => f.path === this.activeFilePath);
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    localStorage.setItem('pg_sidebarOpen', String(this.sidebarOpen));
  }

  /** Flat list of sidebar entries (dirs + files) with depth for indentation. */
  get sidebarEntries(): SidebarEntry[] {
    const entries:   SidebarEntry[] = [];
    const dirFiles   = new Map<string, ProjectFile[]>();
    const rootFiles: ProjectFile[]  = [];

    for (const f of this.projectFiles) {
      const parts = f.path.split('/');
      if (parts.length === 1) {
        rootFiles.push(f);
      } else {
        const dir = parts.slice(0, -1).join('/');
        if (!dirFiles.has(dir)) dirFiles.set(dir, []);
        dirFiles.get(dir)!.push(f);
      }
    }

    for (const f of rootFiles)
      entries.push({ kind: 'file', depth: 0, name: f.name, path: f.path, file: f });

    const addDir = (dirPath: string, depth: number) => {
      entries.push({ kind: 'dir', depth, name: dirPath.split('/').pop()!, path: dirPath });
      if (this.expandedDirs.has(dirPath)) {
        for (const f of (dirFiles.get(dirPath) ?? []))
          entries.push({ kind: 'file', depth: depth + 1, name: f.name, path: f.path, file: f });
        for (const [cp] of dirFiles)
          if (cp !== dirPath && cp.startsWith(dirPath + '/') &&
              cp.split('/').length === dirPath.split('/').length + 1)
            addDir(cp, depth + 1);
      }
    };

    for (const d of [...new Set([...dirFiles.keys()].map(p => p.split('/')[0]))].sort())
      addDir(d, 0);

    return entries;
  }

  /** Toggle collapse/expand of all directories in the sidebar. */
  toggleAllDirs(): void {
    if (this.expandedDirs.size > 0) this.expandedDirs = new Set<string>();
    else this.expandedDirs = this._allDirs(this.projectFiles);
  }

  toggleDir(path: string): void {
    if (this.expandedDirs.has(path)) this.expandedDirs.delete(path);
    else this.expandedDirs.add(path);
  }

  /** Open a file from the sidebar into Monaco. */
  selectFile(file: ProjectFile): void {
    if (file.path === this.activeFilePath) return;
    const cur = this.activeFile;
    if (cur && this.editor) cur.code = this.editor.getValue();
    this.activeFilePath = file.path;
    if (this.editor && (window as any).monaco) {
      const model = this.editor.getModel();
      if (model) (window as any).monaco.editor.setModelLanguage(model, file.monacoLang);
      this.editor.setValue(file.code);
      this.editor.focus();
    }
    this.cdr.detectChanges();
  }

  /** Return the file icon emoji for a sidebar entry. */
  getFileIcon(f: ProjectFile): string {
    const m: Record<string, string> = {
      javascript: '🟨', typescript: '🔷', csharp: '🔵',
      html: '🌐', css: '🎨', sql: '🗄', json: '📌',
    };
    return m[f.monacoLang] ?? '📄';
  }

  /** Add a new blank file to the current project. */
  addFile(): void {
    const extMap: Record<ProjectTemplate['id'], string> = {
      javascript: 'js', typescript: 'ts', csharp: 'cs', sql: 'sql',
    };
    const langMap: Record<string, string> = {
      js: 'javascript', ts: 'typescript', cs: 'csharp', sql: 'sql',
    };
    const ext  = extMap[this.selectedTemplate.id];
    const file: ProjectFile = {
      name:       `file${this.projectFiles.length + 1}.${ext}`,
      path:       `file${this.projectFiles.length + 1}.${ext}`,
      monacoLang: langMap[ext] ?? 'plaintext',
      code:       '',
    };
    this.projectFiles.push(file);
    this.selectFile(file);
  }

  /** Remove a file; if it was active, switch to its neighbour. */
  deleteFile(file: ProjectFile, e: Event): void {
    e.stopPropagation();
    if (this.projectFiles.length <= 1) return;
    const idx = this.projectFiles.indexOf(file);
    this.projectFiles.splice(idx, 1);
    if (this.activeFilePath === file.path)
      this.selectFile(this.projectFiles[Math.max(0, idx - 1)]);
  }

  get isLoggedIn(): boolean { return !!this.auth.currentUser; }

  /** Show the stdin panel only for server-executed (C#) projects. */
  get needsStdin(): boolean {
    return this.selectedTemplate.runAs === 'csharp';
  }

  // ── Resizable output panel ───────────────────────────────────────────────
  startResize(e: MouseEvent): void {
    this._resizing      = true;
    this._resizeStartY  = e.clientY;
    this._resizeStartH  = this.outputHeight;
    document.addEventListener('mousemove', this._resizeBound);
    document.addEventListener('mouseup',   this._resizeEndBound);
    e.preventDefault();
  }

  private _onResizeMove(e: MouseEvent): void {
    if (!this._resizing) return;
    const delta = this._resizeStartY - e.clientY;   // drag up → bigger panel
    this.outputHeight = Math.min(600, Math.max(80, this._resizeStartH + delta));
    this.cdr.markForCheck();
  }

  private _onResizeEnd(): void {
    this._resizing = false;
    document.removeEventListener('mousemove', this._resizeBound);
    document.removeEventListener('mouseup',   this._resizeEndBound);
  }

  ngOnDestroy(): void {
    this.aiSub?.unsubscribe();
    this.pgRequestSub?.unsubscribe();
    clearTimeout(this.saveTimer);
    if (this._resizing) this._onResizeEnd();
    if (this.editor) {
      this.editor.dispose();
      this.editor = null;
    }
  }
}
