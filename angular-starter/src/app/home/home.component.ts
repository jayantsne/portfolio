import { AfterViewChecked, Component, ElementRef, HostListener, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AILearnService } from '../services/ai-learn.service';
import { CustomAuthService } from '../shared/custom-auth.service';
import { NotesService, SavedNote } from '../shared/notes.service';

interface ConceptStep {
  title: string;
  description: string;
  code?: string;
  codeLanguage?: string;
  visual?: string;
  takeaway?: string;
}

interface QuickConcept {
  icon: string;
  name: string;
  difficulty: string;
  steps: ConceptStep[];
}

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Dynamic content types for flexible rendering
interface AIContentBlock {
  type: 'text' | 'code' | 'list' | 'diagram' | 'table' | 'step' | 'callout';
  content: any;
  metadata?: any;
}

interface AIExplanation {
  concept: string;
  explanation: string;
  codeExamples: Array<{title: string; code: string; language: string}>;
  keyPoints: string[];
  followUpQuestions: string[];
  // New: Dynamic rendering properties
  contentBlocks: AIContentBlock[];
  renderMode: 'slides' | 'continuous' | 'visual' | 'mixed';
  hasSteps: boolean;
  hasDiagrams: boolean;
  totalSteps?: number;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, AfterViewChecked, OnDestroy {
  // AI Features
  isAIMode: boolean = false;
  isLoadingAI: boolean = false;
  aiMessages: AIMessage[] = [];
  currentQuestion: string = '';
  aiExplanation: AIExplanation | null = null;
  followUpQuestions: string[] = [];
  showFollowUps: boolean = false;
  
  // Real-time streaming display
  streamingText: string = '';

  // Dynamic rendering properties
  currentSlideIndex: number = 0;
  aiRenderMode: 'slides' | 'continuous' | 'visual' | 'mixed' = 'continuous';
  aiContentBlocks: AIContentBlock[] = [];

  // Session-level concept cache: avoids repeat API calls for the same concept
  private conceptCache = new Map<string, { explanation: AIExplanation; rawText: string }>();

  // Notes save state
  isSavingNote = false;
  noteSaved = false;
  saveError = false;                        // shows brief error feedback on failure
  private noteSavedTimer: any;
  savedMessageIds  = new Set<string>();    // message keys already saved
  savingMessageIds = new Set<string>();    // message keys currently being saved

  // Active follow-up subscription — cancelled before starting a new one
  private followUpSub: Subscription | null = null;

  // Sentinel that tells ngAfterViewChecked to scroll to bottom
  private shouldScrollToBottom = false;

  // Duplicate-detection dialog state
  duplicateDialogMode: 'exact' | 'similar' | null = null;
  duplicateMatchedNote: SavedNote | null = null;
  private pendingSaveContent: string = '';

  constructor(
    private aiLearnService: AILearnService,
    public customAuth: CustomAuthService,
    private notesService: NotesService,
    private router: Router
  ) {}

  // Input properties (for compatibility with main-portfolio component)
  @Input() fullName: string = '';
  @Input() jobTitle: string = '';
  @Input() companyName: string = '';

  // Scroll container reference for auto-scroll-to-bottom
  @ViewChild('mentorBody') private mentorBodyRef!: ElementRef<HTMLElement>;

  // Current topic being explained in split-screen mentor mode
  currentTopicName: string = '';

  // Accordion open/close for tablet view (topic-panel collapsible)
  isTopicAccordionOpen: boolean = false;

  // Search and Modal State
  searchQuery: string = '';
  showModal: boolean = false;
  searchResults: QuickConcept[] = [];
  showSearchResults: boolean = false;

  // Particles for background animation
  particles: { x: number; y: number; delay: number }[] = [];

  // Quick Concepts for demo (DISABLED - Using AI API instead)
  quickConcepts: QuickConcept[] = [
    // All concepts are now handled by AI API dynamically
  ];
  
  // Keep a few demo concepts for quick suggestions only
  demoConcepts: QuickConcept[] = [
    {
      icon: '🔄',
      name: 'Closures',
      difficulty: 'intermediate',
      steps: [
        {
          title: 'What is a Closure?',
          description: 'A closure is a function that has access to variables from its outer (enclosing) scope, even after the outer function has finished executing.',
          code: `function outer() {
  const message = "Hello";
  
  function inner() {
    console.log(message); // Can access outer variable
  }
  
  return inner;
}

const myFunc = outer();
myFunc(); // Prints: Hello`,
          codeLanguage: 'JavaScript',
          takeaway: 'Inner functions remember their outer scope'
        },
        {
          title: 'Why Use Closures?',
          description: 'Closures enable data privacy, function factories, and maintaining state in asynchronous operations.',
          code: `function counter() {
  let count = 0; // Private variable
  
  return {
    increment: () => ++count,
    decrement: () => --count,
    getCount: () => count
  };
}

const myCounter = counter();
myCounter.increment(); // 1
myCounter.increment(); // 2
myCounter.getCount();  // 2`,
          takeaway: 'Create private variables that can only be accessed through specific methods'
        },
        {
          title: 'Real-World Example',
          description: 'Closures are commonly used in event handlers, callbacks, and module patterns.',
          code: `function setupButton(buttonId) {
  let clickCount = 0;
  
  document.getElementById(buttonId).onclick = function() {
    clickCount++;
    console.log(\`Clicked \${clickCount} times\`);
  };
}

setupButton('myButton');`,
          takeaway: 'Perfect for maintaining state across multiple function calls'
        }
      ]
    },
    {
      icon: '⚡',
      name: 'Async/Await',
      difficulty: 'intermediate',
      steps: [
        {
          title: 'Understanding Async/Await',
          description: 'Async/await makes asynchronous code look and behave like synchronous code, making it easier to read and write.',
          code: `// Old way with Promises
fetch('/api/data')
  .then(response => response.json())
  .then(data => console.log(data));

// Modern way with async/await
async function getData() {
  const response = await fetch('/api/data');
  const data = await response.json();
  console.log(data);
}`,
          takeaway: 'Async/await simplifies promise-based code'
        },
        {
          title: 'Error Handling',
          description: 'Use try/catch blocks to handle errors in async functions.',
          code: `async function fetchUser(id) {
  try {
    const response = await fetch(\`/api/users/\${id}\`);
    const user = await response.json();
    return user;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
}`,
          takeaway: 'Always handle errors in async operations'
        }
      ]
    },
    {
      icon: '🎨',
      name: 'Array Methods',
      difficulty: 'beginner',
      steps: [
        {
          title: 'Map, Filter, Reduce',
          description: 'Essential array methods for data transformation.',
          code: `const numbers = [1, 2, 3, 4, 5];

// Map: Transform each element
const doubled = numbers.map(n => n * 2);
// [2, 4, 6, 8, 10]

// Filter: Keep elements that match condition
const evens = numbers.filter(n => n % 2 === 0);
// [2, 4]

// Reduce: Combine all elements into single value
const sum = numbers.reduce((acc, n) => acc + n, 0);
// 15`,
          takeaway: 'Use map for transformation, filter for selection, reduce for aggregation'
        }
      ]
    },
    {
      icon: '🧵',
      name: 'Thread',
      difficulty: 'advanced',
      steps: [
        {
          title: 'What is a Thread?',
          description: 'A thread is the smallest unit of execution within a process. Threads allow programs to perform multiple operations concurrently, utilizing multiple CPU cores for parallel processing.',
          code: `// JavaScript Web Workers (closest to threads)
// main.js
const worker = new Worker('worker.js');

worker.postMessage({ task: 'heavy-computation', data: [1,2,3] });

worker.onmessage = (e) => {
  console.log('Result from worker:', e.data);
};

// worker.js
self.onmessage = (e) => {
  const result = performHeavyTask(e.data);
  self.postMessage(result);
};`,
          codeLanguage: 'JavaScript',
          takeaway: 'Threads enable concurrent execution and better CPU utilization'
        },
        {
          title: 'Thread Lifecycle',
          description: 'Threads go through multiple states: New, Runnable, Running, Blocked/Waiting, and Terminated. Understanding this lifecycle helps in debugging and optimization.',
          code: `// Java Thread Example
class MyThread extends Thread {
  public void run() {
    System.out.println("Thread is running: " + 
      Thread.currentThread().getName());
  }
}

// Create and start threads
MyThread t1 = new MyThread();
MyThread t2 = new MyThread();

t1.start(); // New -> Runnable -> Running
t2.start();

t1.join();  // Wait for thread to complete
t2.join();`,
          codeLanguage: 'Java',
          takeaway: 'Manage thread lifecycle with start(), join(), and proper termination'
        },
        {
          title: 'Thread Safety & Synchronization',
          description: 'When multiple threads access shared resources, you need synchronization to prevent race conditions and data corruption.',
          code: `// Python threading example
import threading

counter = 0
lock = threading.Lock()

def increment():
    global counter
    with lock:  # Synchronize access
        for _ in range(100000):
            counter += 1

threads = [threading.Thread(target=increment) for _ in range(5)]

for t in threads:
    t.start()
for t in threads:
    t.join()

print(f"Final counter: {counter}")`,
          codeLanguage: 'Python',
          takeaway: 'Use locks and synchronization to prevent race conditions'
        },
        {
          title: 'Thread Pools',
          description: 'Thread pools efficiently manage multiple threads by reusing them, reducing the overhead of creating and destroying threads repeatedly.',
          code: `// Node.js Worker Threads Pool
const { Worker } = require('worker_threads');

class ThreadPool {
  constructor(size) {
    this.workers = [];
    for (let i = 0; i < size; i++) {
      this.workers.push(new Worker('./worker.js'));
    }
    this.currentWorker = 0;
  }
  
  execute(task) {
    const worker = this.workers[this.currentWorker];
    this.currentWorker = (this.currentWorker + 1) % this.workers.length;
    
    return new Promise((resolve, reject) => {
      worker.postMessage(task);
      worker.once('message', resolve);
      worker.once('error', reject);
    });
  }
}

const pool = new ThreadPool(4);`,
          codeLanguage: 'JavaScript',
          takeaway: 'Thread pools improve performance by reusing threads'
        }
      ]
    }
  ];

  selectedConcept: QuickConcept | null = null;
  currentStep = 0;

  // ── Popular Concepts ──────────────────────────────────────────────────────
  popularConcepts = [
    { icon: '⚡', name: 'Async Programming', desc: 'Understand async and await' },
    { icon: '💉', name: 'Dependency Injection', desc: 'Learn DI principles' },
    { icon: '🎨', name: 'Design Patterns', desc: 'Explore common patterns' },
    { icon: '🔒', name: 'SOLID Principles', desc: 'Write maintainable code' },
    { icon: '🔄', name: 'Closures', desc: 'Master scope and closures' },
    { icon: '🧪', name: 'Testing Strategies', desc: 'Unit and integration tests' },
  ];

  ngOnInit(): void {
    // Generate particles for background animation
    this.particles = Array.from({ length: 30 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5
    }));

    // No auto-select - waiting for AI search
    // User will search and use AI dynamically
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.followUpSub?.unsubscribe();
    clearTimeout(this.noteSavedTimer);
  }

  private scrollToBottom(): void {
    try {
      const el = this.mentorBodyRef?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch { /* no-op */ }
  }

  selectConcept(concept: QuickConcept): void {
    this.selectedConcept = concept;
    this.currentStep = 0;
    this.showModal = true;
    this.searchQuery = '';
    this.showSearchResults = false;
  }

  setStep(index: number): void {
    this.currentStep = index;
  }

  nextStep(): void {
    if (this.selectedConcept && this.currentStep < this.selectedConcept.steps.length - 1) {
      this.currentStep++;
      this.scrollToStep();
    }
  }

  previousStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.scrollToStep();
    }
  }

  scrollToStep(): void {
    const stepCards = document.querySelectorAll('.step-card');
    if (stepCards[this.currentStep]) {
      stepCards[this.currentStep].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  copyCode(code: string): void {
    navigator.clipboard.writeText(code).then(() => {
      alert('Code copied to clipboard!');
    });
  }

  // Search functionality
  onSearchInput(event: any): void {
    this.searchQuery = event.target.value;
    if (this.searchQuery.trim().length > 0) {
      this.searchConcepts();
      this.showSearchResults = true;
    } else {
      this.showSearchResults = false;
      this.searchResults = [];
    }
  }

  searchConcepts(): void {
    // Always return empty results to force AI API usage
    this.searchResults = [];
    // User will use "Ask AI" button or press Enter to trigger AI search
  }
  
  onSearchEnter(): void {
    // Trigger AI search when user presses Enter
    if (this.searchQuery.trim().length > 0) {
      this.askAIFromSearch();
    }
  }

  selectFromSearch(concept: QuickConcept): void {
    this.selectConcept(concept);
  }

  // Modal controls
  closeModal(): void {
    this.showModal = false;
    this.currentStep = 0;
    this.isTopicAccordionOpen = false;
  }

  toggleTopicAccordion(): void {
    this.isTopicAccordionOpen = !this.isTopicAccordionOpen;
  }

  /** Save a single assistant message as a note (per-message saving state) */
  async saveMessageNote(msg: AIMessage): Promise<void> {
    const key = msg.timestamp.getTime().toString();
    if (this.savedMessageIds.has(key) || this.savingMessageIds.has(key)) return;
    this.savingMessageIds.add(key);
    try {
      const topic = this.currentTopicName || 'AI Mentor';
      await this.notesService.saveNote(topic, 'Other', msg.content);
      this.savedMessageIds.add(key);
    } catch (e) {
      console.error('[saveMessageNote]', e);
    } finally {
      this.savingMessageIds.delete(key);
    }
  }

  async saveCurrentNote(): Promise<void> {
    if (this.isSavingNote || this.noteSaved) return;
    const content = this.aiExplanation?.explanation || this.streamingText;
    if (!content || !this.currentTopicName) return;

    // ── Duplicate detection ───────────────────────────────────────────────
    const exact = this.notesService.findExactDuplicate(this.currentTopicName, content);
    if (exact) {
      this.duplicateMatchedNote  = exact;
      this.duplicateDialogMode   = 'exact';
      this.pendingSaveContent    = content;
      return;
    }

    const similar = this.notesService.findSimilarNotes(this.currentTopicName);
    if (similar.length > 0) {
      this.duplicateMatchedNote  = similar[0]; // surface the closest match
      this.duplicateDialogMode   = 'similar';
      this.pendingSaveContent    = content;
      return;
    }
    // ─────────────────────────────────────────────────────────────────────

    await this.performSave(content);
  }

  /** Called when user chooses "Save as new note" from the similar-note dialog */
  async onDuplicateSaveNew(): Promise<void> {
    this.closeDuplicateDialog();
    await this.performSave(this.pendingSaveContent);
  }

  /** Called when user chooses "Update existing note" from the similar-note dialog */
  async onDuplicateUpdate(): Promise<void> {
    if (!this.duplicateMatchedNote?.id) return;
    const id = this.duplicateMatchedNote.id;
    this.closeDuplicateDialog();
    this.isSavingNote = true;
    try {
      await this.notesService.updateNote(id, { content: this.pendingSaveContent });
      this.noteSaved = true;
      clearTimeout(this.noteSavedTimer);
      this.noteSavedTimer = setTimeout(() => { this.noteSaved = false; }, 4000);
    } catch (e) {
      console.error('[updateNote]', e);
    } finally {
      this.isSavingNote = false;
    }
  }

  /** Called when user chooses "Merge with existing note" from the similar-note dialog */
  async onDuplicateMerge(): Promise<void> {
    if (!this.duplicateMatchedNote?.id) return;
    const id = this.duplicateMatchedNote.id;
    this.closeDuplicateDialog();
    this.isSavingNote = true;
    try {
      await this.notesService.mergeNote(id, this.pendingSaveContent);
      this.noteSaved = true;
      clearTimeout(this.noteSavedTimer);
      this.noteSavedTimer = setTimeout(() => { this.noteSaved = false; }, 4000);
    } catch (e) {
      console.error('[mergeNote]', e);
    } finally {
      this.isSavingNote = false;
    }
  }

  /** Navigate to the Notes page to view the matched note */
  onDuplicateViewNote(): void {
    this.closeDuplicateDialog();
    this.router.navigate(['/notes']);
  }

  onDuplicateCancel(): void {
    this.closeDuplicateDialog();
  }

  private closeDuplicateDialog(): void {
    this.duplicateDialogMode  = null;
    this.duplicateMatchedNote = null;
    this.pendingSaveContent   = '';
  }

  private async performSave(content: string): Promise<void> {
    this.isSavingNote = true;
    this.saveError = false;
    try {
      await this.notesService.saveNote(this.currentTopicName, 'Other', content);
      this.noteSaved = true;
      clearTimeout(this.noteSavedTimer);
      this.noteSavedTimer = setTimeout(() => { this.noteSaved = false; }, 4000);
    } catch (e) {
      console.error('[saveNote]', e);
      this.saveError = true;
      setTimeout(() => { this.saveError = false; }, 4000);
    } finally {
      this.isSavingNote = false;
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(event: KeyboardEvent): void {
    if (this.showModal) {
      this.closeModal();
    }
  }

  // Focus on search input
  focusSearch(): void {
    const searchInput = document.querySelector('.search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      // Scroll to search if not visible
      searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // ==================== AI-POWERED FEATURES ====================

  /**
   * Toggle between manual mode (hardcoded concepts) and AI mode (dynamic explanations)
   */
  toggleAIMode(): void {
    this.isAIMode = !this.isAIMode;
    if (this.isAIMode) {
      console.log('🤖 AI Mode Enabled - Explanations will be generated dynamically');
    } else {
      console.log('📚 Manual Mode - Using predefined concepts');
    }
  }

  /**
   * Ask AI to explain any concept (called when user searches for something)
   */
  async askAI(conceptName: string): Promise<void> {
    console.log('🤖 askAI called for concept:', conceptName);
    
    if (this.isLoadingAI) {
      console.log('⏳ AI is already loading, skipping...');
      return;
    }

    // ── Session cache: return immediately if already fetched this session ──
    const cacheKey = conceptName.trim().toLowerCase();
    const cached = this.conceptCache.get(cacheKey);
    if (cached) {
      console.log('[HOME] cache hit for:', conceptName);
      this.currentTopicName = conceptName;
      this.showModal = true;
      this.isAIMode = true;
      this.isLoadingAI = false;
      this.streamingText = '';
      this.aiMessages = [{
        role: 'user',
        content: `Explain "${conceptName}" to me`,
        timestamp: new Date()
      }];
      this.aiExplanation = cached.explanation;
      this.aiContentBlocks = cached.explanation.contentBlocks || [];
      this.aiRenderMode = cached.explanation.renderMode || 'continuous';
      this.followUpQuestions = cached.explanation.followUpQuestions || [];
      this.showFollowUps = this.followUpQuestions.length > 0;
      // Reset save state for this new topic
      this.noteSaved = false;
      this.isSavingNote = false;
      this.saveError = false;
      this.savedMessageIds.clear();
      this.savingMessageIds.clear();
      this.shouldScrollToBottom = true;
      return;
    }

    console.log('🚀 Starting AI explanation...');
    this.currentTopicName = conceptName;
    this.isLoadingAI = true;
    this.showModal = true;
    this.isAIMode = true;
    this.aiMessages = [];
    this.aiExplanation = null;
    this.followUpQuestions = [];
    // Reset save state for this new topic
    this.noteSaved = false;
    this.isSavingNote = false;
    this.saveError = false;
    this.savedMessageIds.clear();
    this.savingMessageIds.clear();
    this.streamingText = '';
    this.shouldScrollToBottom = true;

    // Add user message
    this.aiMessages.push({
      role: 'user',
      content: `Explain "${conceptName}" to me`,
      timestamp: new Date()
    });

    try {
      // Build an intent-aware mentor prompt:
      // • deep-dive keywords → full structured study notes
      // • everything else → short, ChatGPT-style conversational answer
      const topicTitle = conceptName.trim();
      const wantsDeepDive = /\b(deep dive|in depth|in detail|comprehensive|full explanation|advanced|internals?|under the hood|walk me through|step by step|explain everything)\b/i.test(topicTitle);
      const prompt = wantsDeepDive
        ? this.buildDeepDivePrompt(topicTitle)
        : this.buildQuickAnswerPrompt(topicTitle);

      // Call AI service — handles real-time streaming
      this.streamingText = '';
      this.aiLearnService.getOllamaExplanation(prompt).subscribe({
        next: (response: any) => {
          console.log('[HOME] next: done=', response.done, 'success=', response.success, 'len=', response.explanation?.length);
          if (!response.done) {
            // Partial token update — show streaming text immediately
            this.streamingText = this.stripSystemPrompt(response.explanation || '');
            this.isLoadingAI = false; // hide spinner, show streaming text
            this.shouldScrollToBottom = true;
            return;
          }

          // Final complete response
          this.isLoadingAI = false;

          const responseText: string = this.stripSystemPrompt(response.explanation || response.rawText || response.answer || response.text || '');
          console.log('[HOME] final responseText len=', responseText.length, 'success=', response.success);

          if (!responseText || !response.success) {
            console.warn('[HOME] no responseText or not success, using fallback');
            this.streamingText = '';
            // Show the error message in chat so the user knows what happened
            if (!response.success && responseText) {
              this.aiMessages.push({
                role: 'assistant',
                content: responseText,
                timestamp: new Date()
              });
            }
            this.useFallbackConcept(conceptName);
            return;
          }

          // Parse AI response into structured format
          try {
            const aiResponse = this.parseAIResponse(conceptName, responseText);
            this.aiExplanation = aiResponse;
            console.log('[HOME] aiExplanation set, renderMode=', this.aiRenderMode, 'blocks=', this.aiContentBlocks.length);
            this.aiMessages.push({
              role: 'assistant',
              content: aiResponse.explanation,
              timestamp: new Date()
            });
            this.followUpQuestions = aiResponse.followUpQuestions;
          } catch (parseErr) {
            console.error('[HOME] parseAIResponse threw:', parseErr);
            // Fallback: show raw text directly without parsing
            this.aiRenderMode = 'continuous';
            this.aiContentBlocks = [{ type: 'text', content: responseText, metadata: {} }];
            this.aiExplanation = {
              concept: conceptName,
              explanation: responseText,
              codeExamples: [],
              keyPoints: [],
              followUpQuestions: [
                `Can you show me a real-world example of ${conceptName}?`,
                `What are common mistakes when using ${conceptName}?`,
                `How does ${conceptName} compare to similar concepts?`
              ],
              contentBlocks: this.aiContentBlocks,
              renderMode: 'continuous',
              hasSteps: false,
              hasDiagrams: false,
              totalSteps: 0
            } as any;
            this.aiMessages.push({
              role: 'assistant',
              content: responseText,
              timestamp: new Date()
            });
            this.followUpQuestions = (this.aiExplanation as any).followUpQuestions;
          }
          // Clear streaming text AFTER aiExplanation is set (no blank flash)
          this.streamingText = '';
          this.showFollowUps = true;
          this.noteSaved = false;
          this.shouldScrollToBottom = true;

          // Store in session cache so repeat asks are instant
          if (this.aiExplanation) {
            this.conceptCache.set(cacheKey, {
              explanation: this.aiExplanation,
              rawText: responseText
            });
          }
        },
        error: (error) => {
          console.error('AI Error:', error);
          this.isLoadingAI = false;
          this.streamingText = '';
          this.aiMessages.push({
            role: 'assistant',
            content: '⚠️ AI service temporarily unavailable.',
            timestamp: new Date()
          });
          this.useFallbackConcept(conceptName);
        }
      });
    } catch (error) {
      console.error('Error asking AI:', error);
      this.isLoadingAI = false;
      this.useFallbackConcept(conceptName);
    }
  }

  /**
   * Send a follow-up question to AI for deeper understanding
   */
  async sendFollowUpQuestion(question: string): Promise<void> {
    if (this.isLoadingAI || !question.trim()) return;

    // Cancel any in-flight follow-up subscription
    this.followUpSub?.unsubscribe();
    this.followUpSub = null;

    this.isLoadingAI = true;
    // Clear input immediately so the user can't re-send the same question
    this.currentQuestion = '';
    this.streamingText = '';

    // Add user message
    this.aiMessages.push({
      role: 'user',
      content: question,
      timestamp: new Date()
    });
    this.shouldScrollToBottom = true;

    try {
      // If the user explicitly asks for a deep dive, generate full structured notes;
      // otherwise give a context-aware conversational reply.
      const wantsDeepDive = /\b(deep dive|in depth|explain (everything|fully|in detail|more|further|all of it)|go deeper|comprehensive|full explanation|detailed|tell me everything|show me everything)\b/i.test(question.trim());

      let prompt: string;
      if (wantsDeepDive) {
        const topicForDive = (this.aiExplanation as any)?.concept ?? question.replace(/deep dive|in depth|explain (more|fully|in detail)/gi, '').trim();
        prompt = this.buildDeepDivePrompt(topicForDive || question);
      } else {
        // Context-aware conversational follow-up
        const historyLines = this.aiMessages
          .slice(-6)
          .map(m => `${m.role === 'user' ? '**User**' : '**Mentor**'}: ${m.content.slice(0, 600)}`)
          .join('\n\n');

        prompt =
          `You are an expert senior software engineer and programming mentor. ` +
          `Answer the student's follow-up question based on the conversation. ` +
          `Be direct, practical, and conversational. No filler phrases like "Sure!" or "Certainly!".\n\n` +
          `---\n` +
          `**Conversation so far:**\n${historyLines}\n` +
          `---\n\n` +
          `**Student's question:** ${question}\n\n` +
          `Rules:\n` +
          `- Answer only what was asked — don't repeat what was already covered\n` +
          `- Match response length to the question — short questions get short answers\n` +
          `- Use ## headings only if the answer has multiple distinct parts\n` +
          `- Wrap all code in fenced blocks with language identifier (e.g. \`\`\`javascript)\n` +
          `- **Bold** key terms\n` +
          `- End with 2 brief follow-up questions the student might want to explore next`;
      }

      this.followUpSub = this.aiLearnService.getOllamaExplanation(prompt).subscribe({
        next: (response: any) => {
          if (!response.done) {
            // Show streaming text in real-time — keep isLoadingAI true to block double-sends
            this.streamingText = this.stripSystemPrompt(response.explanation || '');
            this.shouldScrollToBottom = true;
            return;
          }

          // Final response
          this.isLoadingAI = false;
          this.streamingText = '';

          const responseText: string = this.stripSystemPrompt(response.explanation || '');
          if (!response.success || !responseText) {
            this.aiMessages.push({
              role: 'assistant',
              content: responseText || '⚠️ The AI is currently unavailable. Please try again in a moment.',
              timestamp: new Date()
            });
          } else {
            this.aiMessages.push({
              role: 'assistant',
              content: responseText,
              timestamp: new Date()
            });
          }

          this.shouldScrollToBottom = true;
          this.generateFollowUpQuestions();
        },
        error: (error) => {
          console.error('Follow-up error:', error);
          this.isLoadingAI = false;
          this.streamingText = '';
          this.aiMessages.push({
            role: 'assistant',
            content: '⚠️ Unable to process your question right now. Please try again.',
            timestamp: new Date()
          });
          this.shouldScrollToBottom = true;
        }
      });
    } catch (error) {
      console.error('Error sending follow-up:', error);
      this.isLoadingAI = false;
    }
  }

  /**
   * Builds a short, ChatGPT-style answer for simple/definition questions.
   * Response is conversational (150-300 words) with optional mini code snippet.
   */
  private buildQuickAnswerPrompt(topic: string): string {
    return (
      `You are a friendly, expert software engineering mentor. ` +
      `Answer conversationally like ChatGPT — concise, clear, and direct.\n\n` +
      `Topic: "${topic}"\n\n` +
      `Response format:\n` +
      `**Definition** — A clear, 2-3 sentence definition. No filler phrases like "Sure!", "Certainly!", or "Great question!". Get straight to the point.\n\n` +
      `**Quick example** — If a code snippet (≤ 10 lines) makes the concept tangible, include it in a fenced block with the language identifier.\n\n` +
      `**Analogy** — One optional sentence if a great real-world analogy exists.\n\n` +
      `**Go deeper** — End with exactly: "Want to go deeper? I can cover: [list 3 specific follow-up aspects separated by commas]"\n\n` +
      `Rules:\n` +
      `- Total response length: 150-300 words\n` +
      `- Use **bold** for key terms on first use\n` +
      `- Skip large ## section headers — keep it conversational\n` +
      `- Wrap all code in fenced blocks with language identifier\n` +
      `- Do NOT produce a long structured article for a simple definition question`
    );
  }

  /**
   * Builds a comprehensive structured study notes prompt for deep-dive requests.
   * Response uses all sections: Definition, Why it matters, How it works, Code Example,
   * Common Mistakes, Best Practices, Interview Tips, Follow-up Questions.
   */
  private buildDeepDivePrompt(topic: string): string {
    return (
      `You are an expert senior software engineer and programming mentor. ` +
      `Explain "${topic}" as comprehensive study notes for an intermediate developer preparing for a technical interview. ` +
      `Never start with filler phrases like "Sure!", "Certainly!", or "Great question!". Go straight into the explanation.\n\n` +

      `## What is ${topic}?\n` +
      `One-sentence definition. Then a real-world analogy that makes it click.\n\n` +

      `## Why it matters\n` +
      `The problem it solves and when developers actually encounter it in production code.\n\n` +

      `## How it works (step-by-step)\n` +
      `Numbered steps. Include a simple ASCII diagram if it helps visualise the concept.\n\n` +

      `## Code Example\n` +
      `A practical, self-contained example with inline comments explaining key lines.\n` +
      `Use the most relevant language (TypeScript / JavaScript / Python / Java as appropriate).\n` +
      `Wrap in a fenced block with the language identifier, e.g.:\n` +
      `\`\`\`typescript\n// your code here\n\`\`\`\n\n` +

      `## Common Mistakes ❌\n` +
      `Exactly 3 common mistakes developers make, each with a one-line fix.\n\n` +

      `## Best Practices ✅\n` +
      `3-5 actionable best practices.\n\n` +

      `## Interview Tips 🎯\n` +
      `2-3 things an interviewer is really testing when they ask about ${topic}. Include one tricky follow-up question they might ask.\n\n` +

      `## Follow-up Questions\n` +
      `Exactly 3 numbered questions the reader might want to explore next.\n\n` +

      `Formatting: use ## headings, **bold** key terms on first use, \`inline code\` for short snippets, ` +
      `fenced code blocks with language identifier for multi-line code. No wall-of-text paragraphs.`
    );
  }

  /** Strip echoed system prompt from AI response if the model repeated it back */
  private stripSystemPrompt(text: string): string {
    if (!text) return text;
    const t = text.replace(/^\s+/, '');

    // ── Case 1: Full prompt echoed — look for "Rules:" OR "Formatting rules:" ──
    const rulesPatterns = ['Formatting rules:', 'Rules:'];
    for (const pattern of rulesPatterns) {
      const rulesIdx = t.indexOf(pattern);
      if (rulesIdx !== -1 && /You are an expert/i.test(t.substring(0, rulesIdx))) {
        const afterRules = t.indexOf('\n', rulesIdx);
        // Try to find the first real heading after the rules line
        const firstHeading = afterRules !== -1 ? t.search(/^#{1,3}\s/m) : -1;
        if (firstHeading > rulesIdx) {
          return t.substring(firstHeading).replace(/^\s+/, '');
        }
        return afterRules !== -1 ? t.substring(afterRules + 1).replace(/^\s+/, '') : '';
      }
    }

    // ── Case 2: Model echoes only the opening line (plain or **bold**) ────────
    // Matches: "You are an expert..." OR "**You are an expert...**"
    if (/^\*{0,2}You are an expert/i.test(t)) {
      const blankLine   = t.indexOf('\n\n');
      const firstHeader = t.search(/^#{1,3}\s/m);

      if (blankLine === -1 && firstHeader === -1) {
        // Still mid-echo with no real content yet — hide it entirely
        return '';
      }

      const cutAt = (blankLine !== -1 && firstHeader !== -1)
        ? Math.min(blankLine, firstHeader)
        : (blankLine !== -1 ? blankLine : firstHeader);
      return t.substring(cutAt).replace(/^\s+/, '');
    }

    return text;
  }

  private parseAIResponse(conceptName: string, rawResponse: string): AIExplanation {
    console.log('🔍 Parsing AI response for concept:', conceptName);
    
    const contentBlocks: AIContentBlock[] = [];
    const codeExamples: Array<{title: string; code: string; language: string}> = [];
    const keyPoints: string[] = [];
    const followUpQuestions: string[] = [];
    
    // Split response into sections
    const sections = this.splitIntoSections(rawResponse);
    
    // Analyze each section and create content blocks
    sections.forEach((section, index) => {
      const sectionType = this.detectSectionType(section);
      
      switch (sectionType) {
        case 'code':
          const codeBlock = this.extractCodeBlock(section);
          if (codeBlock) {
            contentBlocks.push({
              type: 'code',
              content: codeBlock,
              metadata: { index: codeExamples.length }
            });
            codeExamples.push(codeBlock);
          }
          break;
        
        case 'list':
          const listItems = this.extractListItems(section);
          if (listItems.length > 0) {
            contentBlocks.push({
              type: 'list',
              content: listItems,
              metadata: { style: 'bullet' }
            });
            keyPoints.push(...listItems);
          }
          break;
        
        case 'diagram':
          contentBlocks.push({
            type: 'diagram',
            content: section,
            metadata: { format: 'ascii' }
          });
          break;
        
        case 'callout':
          contentBlocks.push({
            type: 'callout',
            content: section.replace(/^>\s*/, ''),
            metadata: { style: 'important' }
          });
          break;
        
        case 'step':
          contentBlocks.push({
            type: 'step',
            content: section,
            metadata: { stepNumber: index + 1 }
          });
          break;
        
        case 'table':
          const tableData = this.extractTable(section);
          if (tableData) {
            contentBlocks.push({
              type: 'table',
              content: tableData,
              metadata: {}
            });
          }
          break;
        
        default:
          // Process markdown in text blocks
          const processedText = this.processMarkdown(section);
          contentBlocks.push({
            type: 'text',
            content: processedText,
            metadata: {}
          });
      }
    });
    
    // Extract follow-up questions — prefer the dedicated ## Follow-up Questions section
    const followUpSection = rawResponse.match(/##\s*Follow-up Questions[\s\S]*?(?=\n##|\n---|\n\*\*|\s*$)/i);
    if (followUpSection) {
      const lines = followUpSection[0].split('\n');
      for (const line of lines) {
        const cleaned = line.replace(/^[\d\.\-\*\s]+/, '').trim();
        if (cleaned.length > 10 && cleaned.endsWith('?')) {
          followUpQuestions.push(cleaned);
        }
      }
    }

    // Fallback: scan the whole response for question-sentences
    if (followUpQuestions.length === 0) {
      const questionMatches = rawResponse.match(/[^.!?\n]{15,120}\?/g);
      if (questionMatches) {
        questionMatches.forEach(q => {
          const cleaned = q.trim();
          if (cleaned.length > 10 && cleaned.length < 150) {
            followUpQuestions.push(cleaned);
          }
        });
      }
    }

    // Default follow-ups if none found at all
    if (followUpQuestions.length === 0) {
      followUpQuestions.push(
        `Can you show me a real-world example of ${conceptName}?`,
        `What are common mistakes when using ${conceptName}?`,
        `How does ${conceptName} compare to similar concepts?`
      );
    }
    
    // Determine render mode based on content structure
    const renderMode = this.determineRenderMode(contentBlocks, rawResponse);
    const hasSteps = contentBlocks.some(b => b.type === 'step') || this.hasNumberedSections(rawResponse);
    const hasDiagrams = contentBlocks.some(b => b.type === 'diagram');
    const totalSteps = hasSteps ? this.countSteps(contentBlocks, rawResponse) : 0;
    
    console.log('✨ Detected render mode:', renderMode, 'Steps:', totalSteps, 'Diagrams:', hasDiagrams);
    
    // Update component rendering properties
    this.aiRenderMode = renderMode;
    this.aiContentBlocks = contentBlocks;
    this.currentSlideIndex = 0;
    
    return {
      concept: conceptName,
      explanation: rawResponse,
      codeExamples: codeExamples.length > 0 ? codeExamples : [{
        title: 'Example',
        code: '// AI-generated example would appear here',
        language: 'javascript'
      }],
      keyPoints: keyPoints.length > 0 ? keyPoints : ['Understanding the core concept', 'Practical applications', 'Best practices'],
      followUpQuestions: followUpQuestions.slice(0, 3),
      contentBlocks,
      renderMode,
      hasSteps,
      hasDiagrams,
      totalSteps
    };
  }

  /**
   * Split response into logical sections
   */
  private splitIntoSections(response: string): string[] {
    // Ensure response is a string
    if (typeof response !== 'string') {
      console.error('❌ splitIntoSections received non-string:', typeof response);
      response = String(response || '');
    }
    
    // Split by markdown headers, code blocks, and paragraphs
    const sections: string[] = [];
    let currentSection = '';
    let inCodeBlock = false;
    
    const lines = response.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for code block boundaries
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          currentSection += line + '\n';
          sections.push(currentSection.trim());
          currentSection = '';
          inCodeBlock = false;
        } else {
          if (currentSection.trim()) {
            sections.push(currentSection.trim());
          }
          currentSection = line + '\n';
          inCodeBlock = true;
        }
        continue;
      }
      
      if (inCodeBlock) {
        currentSection += line + '\n';
        continue;
      }
      
      // Check for section headers
      if (line.match(/^#{1,3}\s+/) || line.match(/^\d+\.\s+[A-Z]/)) {
        if (currentSection.trim()) {
          sections.push(currentSection.trim());
        }
        currentSection = line + '\n';
      } else if (line.trim() === '' && currentSection.trim()) {
        // Empty line - potential section break
        if (currentSection.trim().length > 50) {
          sections.push(currentSection.trim());
          currentSection = '';
        } else {
          currentSection += line + '\n';
        }
      } else {
        currentSection += line + '\n';
      }
    }
    
    if (currentSection.trim()) {
      sections.push(currentSection.trim());
    }
    
    return sections.filter(s => s.length > 0);
  }

  /**
   * Detect the type of content in a section
   */
  private detectSectionType(section: string): 'code' | 'list' | 'diagram' | 'callout' | 'step' | 'table' | 'text' {
    const trimmed = section.trim();
    
    if (trimmed.startsWith('```')) return 'code';
    if (trimmed.startsWith('>')) return 'callout';
    if (trimmed.includes('|') && trimmed.split('\n').filter(l => l.includes('|')).length > 2) return 'table';
    
    // More aggressive list detection
    const listLineCount = trimmed.split('\n').filter(l => l.match(/^[-*•]\s/)).length;
    if (listLineCount >= 2) return 'list';
    
    // More aggressive step detection
    if (trimmed.match(/^#+\s*\d+[.:]/) || trimmed.match(/^\d+\.\s+[A-Z]/)) return 'step';
    if (trimmed.match(/^(Step|Part|Section)\s+\d+/i)) return 'step';
    
    if (this.looksLikeDiagram(trimmed)) return 'diagram';
    
    return 'text';
  }

  /**
   * Check if content looks like an ASCII diagram
   */
  private looksLikeDiagram(content: string): boolean {
    const diagramChars = ['→', '←', '↑', '↓', '│', '─', '┌', '┐', '└', '┘', '├', '┤', '┬', '┴', '┼'];
    return diagramChars.some(char => content.includes(char)) || 
           (content.includes('->') && content.includes('|')) ||
           (content.split('\n').length > 3 && content.includes('+') && content.includes('-'));
  }

  /**
   * Extract code block with metadata
   */
  private extractCodeBlock(section: string): {title: string; code: string; language: string} | null {
    const match = section.match(/```(\w+)?\n([\s\S]*?)```/);
    if (!match) return null;
    
    const language = match[1] || 'javascript';
    const code = match[2].trim();
    const title = this.generateCodeTitle(code, language);
    
    return { title, code, language };
  }

  /**
   * Generate a descriptive title for code
   */
  private generateCodeTitle(code: string, language: string): string {
    const firstLine = code.split('\n')[0].trim();
    
    if (firstLine.startsWith('//') || firstLine.startsWith('#')) {
      return firstLine.replace(/^[\/\/#]\s*/, '');
    }
    
    if (code.includes('function ')) return 'Function Example';
    if (code.includes('class ')) return 'Class Example';
    if (code.includes('const ') || code.includes('let ')) return 'Variable Declaration';
    if (code.includes('import ')) return 'Module Import';
    
    return `${language.charAt(0).toUpperCase() + language.slice(1)} Example`;
  }

  /**
   * Extract list items from section
   */
  private extractListItems(section: string): string[] {
    const items: string[] = [];
    const lines = section.split('\n');
    
    lines.forEach(line => {
      const match = line.match(/^[-*•]\s+(.+)/) || line.match(/^\d+\.\s+(.+)/);
      if (match) {
        items.push(match[1].trim());
      }
    });
    
    return items;
  }

  /**
   * Extract table data
   */
  private extractTable(section: string): {headers: string[]; rows: string[][]} | null {
    const lines = section.split('\n').filter(l => l.includes('|'));
    if (lines.length < 2) return null;
    
    const headers = lines[0].split('|').map(h => h.trim()).filter(h => h);
    const rows = lines.slice(2).map(line => 
      line.split('|').map(cell => cell.trim()).filter(cell => cell)
    );
    
    return { headers, rows };
  }

  /**
   * Determine the best rendering mode based on content
   */
  private determineRenderMode(blocks: AIContentBlock[], rawResponse: string): 'slides' | 'continuous' | 'visual' | 'mixed' {
    const hasMultipleCodeBlocks = blocks.filter(b => b.type === 'code').length > 1;
    const hasDiagrams = blocks.some(b => b.type === 'diagram');
    const hasSteps = blocks.some(b => b.type === 'step') || this.hasNumberedSections(rawResponse);
    const hasCallouts = blocks.filter(b => b.type === 'callout').length > 0;
    const codeBlockCount = blocks.filter(b => b.type === 'code').length;
    
    console.log('🔍 Render mode analysis:', {
      totalBlocks: blocks.length,
      codeBlocks: codeBlockCount,
      hasSteps,
      hasDiagrams,
      hasCallouts
    });
    
    // Visual mode: Heavy on diagrams and visual elements
    if (hasDiagrams && blocks.filter(b => b.type === 'diagram').length > 1) {
      console.log('✅ Selected: VISUAL mode (multiple diagrams)');
      return 'visual';
    }
    
    // Slides mode: Clear step-by-step structure OR multiple distinct sections
    // Lower threshold from 4 to 3 blocks
    if ((hasSteps && blocks.length >= 3) || (blocks.length >= 5 && codeBlockCount >= 2)) {
      console.log('✅ Selected: SLIDES mode (steps or multi-section)');
      return 'slides';
    }
    
    // Mixed mode: Combination of different content types
    if (hasMultipleCodeBlocks && hasCallouts && blocks.length > 4) {
      console.log('✅ Selected: MIXED mode (diverse content)');
      return 'mixed';
    }
    
    // Default: Continuous scroll
    console.log('✅ Selected: CONTINUOUS mode (default)');
    return 'continuous';
  }

  /**
   * Check if response has numbered sections
   */
  private hasNumberedSections(response: string): boolean {
    const numberedHeaders = response.match(/^#+\s*\d+\.|^\d+\.\s+[A-Z]/gm);
    return numberedHeaders !== null && numberedHeaders.length > 2;
  }

  /**
   * Count total steps in content
   */
  private countSteps(blocks: AIContentBlock[], response: string): number {
    const stepBlocks = blocks.filter(b => b.type === 'step').length;
    const numberedSections = (response.match(/^#+\s*\d+\.|^\d+\.\s+[A-Z]/gm) || []).length;
    return Math.max(stepBlocks, numberedSections, 3);
  }

  /**
   * Navigate slides (for slide mode)
   */
  nextSlide(): void {
    if (this.currentSlideIndex < this.aiContentBlocks.length - 1) {
      this.currentSlideIndex++;
    }
  }

  previousSlide(): void {
    if (this.currentSlideIndex > 0) {
      this.currentSlideIndex--;
    }
  }

  goToSlide(index: number): void {
    if (index >= 0 && index < this.aiContentBlocks.length) {
      this.currentSlideIndex = index;
    }
  }

  /**
   * Process markdown formatting in text
   */
  private processMarkdown(text: string): string {
    let processed = text;
    
    // Convert headers
    processed = processed.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    processed = processed.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    processed = processed.replace(/^# (.+)$/gm, '<h2>$1</h2>');
    
    // Convert bold
    processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // Convert italic
    processed = processed.replace(/\*(.+?)\*/g, '<em>$1</em>');
    processed = processed.replace(/_(.+?)_/g, '<em>$1</em>');
    
    // Convert inline code
    processed = processed.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Convert line breaks
    processed = processed.replace(/\n\n/g, '</p><p>');
    processed = '<p>' + processed + '</p>';
    
    // Clean up empty paragraphs
    processed = processed.replace(/<p>\s*<\/p>/g, '');
    
    return processed;
  }

  /**
   * Generate smart follow-up questions based on conversation
   */
  private generateFollowUpQuestions(): void {
    const lastMessage = this.aiMessages[this.aiMessages.length - 1];
    
    // Generate contextual follow-ups
    this.followUpQuestions = [
      'Can you explain that in simpler terms?',
      'Show me another example',
      'What are the best practices?'
    ];
    
    this.showFollowUps = true;
  }

  /**
   * Fallback when AI fails - show error message
   */
  private useFallbackConcept(searchTerm: string): void {
    // Since we're using AI-only mode, show a helpful error
    this.isAIMode = true;
    this.aiExplanation = {
      concept: searchTerm,
      explanation: `Sorry, I couldn't generate an explanation for "${searchTerm}" at the moment. This could be due to:
      
• API rate limits
• Network connectivity issues  
• API key configuration

Please try again in a moment or rephrase your query.`,
      codeExamples: [],
      keyPoints: [
        'Check your internet connection',
        'Verify API keys are properly configured',
        'Try again after a short wait',
        'Consider rephrasing your question'
      ],
      followUpQuestions: [
        'How do I configure API keys?',
        'What are the API rate limits?',
        'Try a different programming concept'
      ],
      contentBlocks: [],
      renderMode: 'continuous',
      hasSteps: false,
      hasDiagrams: false
    };
  }

  /**
   * Enhanced select concept with AI option
   */
  selectConceptWithAI(concept: QuickConcept, useAI: boolean = false): void {
    if (useAI) {
      this.askAI(concept.name);
    } else {
      this.selectConcept(concept);
    }
    
    this.showSearchResults = false;
    this.searchQuery = '';
  }

  /**
   * Quick action to ask AI about search term
   */
  askAIFromSearch(): void {
    console.log('🔍 User clicked Ask AI button for:', this.searchQuery);
    if (this.searchQuery.trim().length > 0) {
      console.log('✅ Triggering AI explanation for:', this.searchQuery.trim());
      this.askAI(this.searchQuery.trim());
      this.showSearchResults = false;
    } else {
      console.warn('⚠️ Search query is empty');
    }
  }
}
