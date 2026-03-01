import { Component, ElementRef, HostListener, Input, OnInit, ViewChild } from '@angular/core';
import { AILearnService } from '../services/ai-learn.service';
import { GoogleAuthService } from '../shared/google-auth.service';
import { NotesService } from '../shared/notes.service';

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
export class HomeComponent implements OnInit {
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
  private noteSavedTimer: any;

  constructor(
    private aiLearnService: AILearnService,
    public googleAuth: GoogleAuthService,
    private notesService: NotesService
  ) {}

  // Input properties (for compatibility with main-portfolio component)
  @Input() fullName: string = '';
  @Input() jobTitle: string = '';
  @Input() companyName: string = '';

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

  /** Save the current AI explanation as a note (requires Google sign-in) */
  async saveCurrentNote(): Promise<void> {
    if (this.isSavingNote || this.noteSaved) return;
    const content = this.aiExplanation?.explanation || this.streamingText;
    if (!content || !this.currentTopicName) return;

    this.isSavingNote = true;
    try {
      await this.notesService.saveNote(this.currentTopicName, content);
      this.noteSaved = true;
      clearTimeout(this.noteSavedTimer);
      this.noteSavedTimer = setTimeout(() => { this.noteSaved = false; }, 4000);
    } catch (e) {
      console.error('[saveNote]', e);
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
      this.noteSaved = false;
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

    // Add user message
    this.aiMessages.push({
      role: 'user',
      content: `Explain "${conceptName}" to me`,
      timestamp: new Date()
    });

    try {
      // Generate a concise, high-quality structured prompt
      const prompt = `You are an expert programming teacher. Explain "${conceptName}" clearly and concisely.

## What is ${conceptName}?
One-sentence definition + real-world analogy.

## Why it matters
2-3 sentences on the problem it solves.

## How it works
Clear step-by-step explanation with a mental model.

## Code Example
A practical, well-commented example:
\`\`\`javascript
// show ${conceptName} in action
\`\`\`

## Common mistakes ❌
3 pitfalls with one-line fixes.

## Quick reference
| Use ✅ | Avoid ❌ |
|---|---|

Rules: use ## headers, **bold** key terms, \`inline code\`, fenced code blocks. Be concise — no filler text.`;

      // Call AI service — handles real-time streaming
      this.streamingText = '';
      this.aiLearnService.getOllamaExplanation(prompt).subscribe({
        next: (response: any) => {
          console.log('[HOME] next: done=', response.done, 'success=', response.success, 'len=', response.explanation?.length);
          if (!response.done) {
            // Partial token update — show streaming text immediately
            this.streamingText = response.explanation || '';
            this.isLoadingAI = false; // hide spinner, show streaming text
            return;
          }

          // Final complete response
          this.isLoadingAI = false;

          const responseText: string = response.explanation || response.rawText || response.answer || response.text || '';
          console.log('[HOME] final responseText len=', responseText.length, 'success=', response.success);

          if (!responseText || !response.success) {
            console.warn('[HOME] no responseText or not success, using fallback');
            this.streamingText = '';
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
    if (this.isLoadingAI) return;

    this.isLoadingAI = true;
    this.currentQuestion = question;

    // Add user message
    this.aiMessages.push({
      role: 'user',
      content: question,
      timestamp: new Date()
    });

    try {
      // Build context from previous conversation
      const context = this.aiMessages
        .slice(-4) // Last 4 messages for context
        .map(m => `${m.role}: ${m.content}`)
        .join('\n\n');

      const prompt = `${context}\n\nuser: ${question}\n\nProvide a clear, concise answer with code examples if relevant.`;

      this.streamingText = '';
      this.aiLearnService.getOllamaExplanation(prompt).subscribe({
        next: (response: any) => {
          if (!response.done) {
            // Show streaming text in real-time
            this.streamingText = response.explanation || '';
            this.isLoadingAI = false;
            return;
          }

          // Final response
          this.isLoadingAI = false;
          this.streamingText = '';

          const responseText: string = response.explanation || '';
          this.aiMessages.push({
            role: 'assistant',
            content: responseText,
            timestamp: new Date()
          });

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
        }
      });
    } catch (error) {
      console.error('Error sending follow-up:', error);
      this.isLoadingAI = false;
    }
  }

  /**
   * Parse AI response into structured format with dynamic rendering detection
   */
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
    
    // Extract follow-up questions
    const questionMatches = rawResponse.match(/[^.!?]*\?[^.!?]*/g);
    if (questionMatches) {
      questionMatches.forEach(q => {
        const cleaned = q.trim();
        if (cleaned.length > 10 && cleaned.length < 150) {
          followUpQuestions.push(cleaned);
        }
      });
    }
    
    // Generate default follow-ups if none found
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
