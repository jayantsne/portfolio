import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { QuestionsDataService, InterviewQuestion } from '../shared/questions-data.service';
import { AuthService } from '../shared/auth.service';
import { ApiService } from '../shared/api.service';

@Component({
  selector: 'app-questions-public',
  templateUrl: './questions-public.component.html',
  styleUrls: ['./questions-public.component.css']
})
export class QuestionsPublicComponent implements OnInit {
  questions: InterviewQuestion[] = [];
  filteredQuestions: InterviewQuestion[] = [];
  relatedQuestions: Map<number, InterviewQuestion[]> = new Map();
  
  categories: string[] = [];
  selectedCategory: string = 'all';
  searchTerm: string = '';
  selectedDifficulty: string = 'all';
  sortBy: string = 'recent';
  showAIInsights: boolean = true;

  // New AI Features
  bookmarkedQuestions: Set<number> = new Set();
  studyProgress: Map<number, number> = new Map(); // questionId -> progress percentage
  learningStreak: number = 0;
  showAIAssistant: boolean = false;
  currentSpeakingQuestion: number | null = null;
  studyTimeSpent: number = 0;
  private studyTimer?: any;
  
  // Comprehension Helper Features
  complexityLevels: Map<number, 'beginner' | 'intermediate' | 'expert'> = new Map();
  showELI5: Map<number, boolean> = new Map();
  selectedTerms: Map<number, string | null> = new Map();
  showVisualHints: Map<number, boolean> = new Map();
  
  // AI Answer Features - Only show answers via AI button
  loadedAIAnswers: Map<number, boolean> = new Map(); // Track which answers are loaded
  loadingAIAnswers: Map<number, boolean> = new Map(); // Track loading state

  constructor(
    private questionsService: QuestionsDataService,
    private authService: AuthService,
    private router: Router,
    private apiService: ApiService
  ) { 
    this.loadUserProgress();
    this.calculateLearningStreak();
  }

  ngOnInit(): void {
    this.questionsService.questions$.subscribe(questions => {
      this.questions = questions;
      this.extractCategories();
      this.applyFilters();
      this.calculateRelatedQuestions();
    });
    
    // Start study timer
    this.startStudyTimer();
  }

  ngOnDestroy(): void {
    if (this.studyTimer) {
      clearInterval(this.studyTimer);
    }
    this.saveUserProgress();
  }

  private startStudyTimer(): void {
    this.studyTimer = setInterval(() => {
      this.studyTimeSpent++;
      if (this.studyTimeSpent % 60 === 0) { // Every minute
        this.saveUserProgress();
      }
    }, 1000);
  }

  private loadUserProgress(): void {
    this.apiService.getUserProgress().subscribe(
      (data) => {
        this.bookmarkedQuestions = new Set(data.bookmarks || []);
        
        // Convert progress map to Map object
        const progressMap = new Map<number, number>();
        if (data.progress) {
          Object.entries(data.progress).forEach(([key, value]) => {
            progressMap.set(parseInt(key), value);
          });
        }
        this.studyProgress = progressMap;
        this.studyTimeSpent = data.totalTime || 0;
      },
      (error) => {
        console.error('Error loading user progress from MongoDB:', error);
      }
    );
  }

  private saveUserProgress(): void {
    const progressObj: { [key: string]: number } = {};
    this.studyProgress.forEach((value, key) => {
      progressObj[key.toString()] = value;
    });

    const data = {
      bookmarks: Array.from(this.bookmarkedQuestions),
      progress: progressObj,
      totalTime: this.studyTimeSpent,
      lastVisit: new Date(),
      visitDates: [] as string[]
    };
    
    this.apiService.updateUserProgress(data).subscribe(
      () => {
        // Progress saved successfully
      },
      (error) => {
        console.error('Error saving user progress to MongoDB:', error);
      }
    );
  }

  private calculateLearningStreak(): void {
    this.apiService.getUserProgress().subscribe(
      (data) => {
        const dates = data.visitDates || [];
        const today = new Date().toDateString();
        
        if (!dates.includes(today)) {
          dates.push(today);
        }

        // Calculate consecutive days
        const sortedDates = dates.sort((a: string, b: string) => 
          new Date(b).getTime() - new Date(a).getTime()
        );
        
        let streak = 1;
        for (let i = 0; i < sortedDates.length - 1; i++) {
          const current = new Date(sortedDates[i]);
          const previous = new Date(sortedDates[i + 1]);
          const diffDays = Math.floor((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            streak++;
          } else {
            break;
          }
        }
        
        this.learningStreak = streak;
        
        // Update visit dates in MongoDB
        this.apiService.updateUserProgress({ visitDates: dates }).subscribe();
      },
      (error) => {
        console.error('Error calculating learning streak:', error);
        this.learningStreak = 1;
      }
    );
  }

  private extractCategories(): void {
    const categorySet = new Set<string>();
    this.questions.forEach(q => categorySet.add(q.category));
    this.categories = Array.from(categorySet).sort();
  }

  applyFilters(): void {
    let filtered = [...this.questions];

    // Filter by category
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(q => q.category === this.selectedCategory);
    }

    // Filter by difficulty
    if (this.selectedDifficulty !== 'all') {
      filtered = filtered.filter(q => q.difficulty === this.selectedDifficulty);
    }

    // Filter by search term with AI-enhanced relevance
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(q => 
        q.question.toLowerCase().includes(term) || 
        q.answer.toLowerCase().includes(term) ||
        q.category.toLowerCase().includes(term) ||
        (q.tags && q.tags.some(tag => tag.toLowerCase().includes(term)))
      );
    }

    // Sort questions
    this.sortQuestions(filtered);
    
    this.filteredQuestions = filtered;
  }

  private sortQuestions(questions: InterviewQuestion[]): void {
    switch (this.sortBy) {
      case 'recent':
        questions.sort((a, b) => {
          const dateA = a.dateAdded ? new Date(a.dateAdded).getTime() : 0;
          const dateB = b.dateAdded ? new Date(b.dateAdded).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'difficulty':
        const difficultyOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
        questions.sort((a, b) => {
          const orderA = a.difficulty ? difficultyOrder[a.difficulty] : 2;
          const orderB = b.difficulty ? difficultyOrder[b.difficulty] : 2;
          return orderA - orderB;
        });
        break;
      case 'category':
        questions.sort((a, b) => a.category.localeCompare(b.category));
        break;
    }
  }

  private calculateRelatedQuestions(): void {
    this.questions.forEach(question => {
      const related = this.findRelatedQuestions(question);
      this.relatedQuestions.set(question.id, related);
    });
  }

  private findRelatedQuestions(question: InterviewQuestion): InterviewQuestion[] {
    return this.questions
      .filter(q => q.id !== question.id && q.category === question.category)
      .slice(0, 3);
  }

  getRelatedQuestions(questionId: number): InterviewQuestion[] {
    return this.relatedQuestions.get(questionId) || [];
  }

  toggleQuestion(question: InterviewQuestion): void {
    question.expanded = !question.expanded;
  }

  /**
   * Check if AI answer is loaded for a question
   */
  isAIAnswerLoaded(questionId: number): boolean {
    return this.loadedAIAnswers.get(questionId) || false;
  }

  /**
   * Check if AI answer is currently loading
   */
  isAIAnswerLoading(questionId: number): boolean {
    return this.loadingAIAnswers.get(questionId) || false;
  }

  /**
   * Get AI-generated answer for a question
   * Simulates AI processing with a delay
   */
  getAIAnswer(questionId: number): void {
    // Set loading state
    this.loadingAIAnswers.set(questionId, true);
    
    // Simulate AI processing delay
    setTimeout(() => {
      // Mark answer as loaded
      this.loadedAIAnswers.set(questionId, true);
      this.loadingAIAnswers.set(questionId, false);
      
      // Mark as studied with progress
      this.markAsStudied(questionId);
    }, 1500); // 1.5 second delay to simulate AI processing
  }

  getAIComplexityScore(question: InterviewQuestion): number {
    const answerLength = question.answer.length;
    const hasCode = /```|`[^`]+`/.test(question.answer);
    const hasList = /\n-|\n\d+\./.test(question.answer);
    
    let score = 0;
    if (answerLength > 500) score += 3;
    else if (answerLength > 200) score += 2;
    else score += 1;
    
    if (hasCode) score += 2;
    if (hasList) score += 1;
    
    return Math.min(score, 5);
  }

  getAIReadingTime(question: InterviewQuestion): number {
    const wordsPerMinute = 200;
    const words = question.answer.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute) || 1;
  }

  getAIKeywords(question: InterviewQuestion): string[] {
    const commonWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this', 'it', 'from', 'are', 'was', 'be', 'been', 'has', 'have']);
    const words = question.answer.toLowerCase().match(/\b\w+\b/g) || [];
    const wordFreq = new Map<string, number>();
    
    words.forEach(word => {
      if (word.length > 3 && !commonWords.has(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });
    
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * ELI5 (Explain Like I'm 5) - Super simple explanation
   */
  getELI5Explanation(question: InterviewQuestion): string {
    const category = question.category.toLowerCase();
    const questionText = question.question.toLowerCase();
    
    // Generate context-aware simple explanations
    if (questionText.includes('closure') || questionText.includes('scope')) {
      return "Think of it like a backpack 🎒. When you go on a trip (run a function), you pack things you need. Even when you come back home, you still have those things in your backpack. That's how closures work - functions remember things they packed!";
    } else if (questionText.includes('promise') || questionText.includes('async')) {
      return "Imagine ordering pizza 🍕. You don't stand at the door waiting - you do other things! When the pizza arrives, the doorbell rings and you handle it. Promises work the same way - you don't wait, you handle it when it's ready!";
    } else if (questionText.includes('component') || questionText.includes('react')) {
      return "Think of components like LEGO blocks 🧱. Each block is a small piece that does one thing. You connect many blocks to build something amazing! That's how we build websites with components.";
    } else if (questionText.includes('api') || questionText.includes('http')) {
      return "An API is like a waiter at a restaurant 🍽️. You (the app) tell the waiter what you want. The waiter takes your order to the kitchen (server) and brings back your food (data). You don't need to know how the kitchen works!";
    } else if (questionText.includes('array') || questionText.includes('loop')) {
      return "Think of an array like a row of mailboxes 📬. Each box has a number and holds something. When you loop, you walk past each mailbox and check what's inside. Simple!";
    } else if (questionText.includes('class') || questionText.includes('object')) {
      return "A class is like a cookie cutter 🍪. The cutter is the template. When you use it, you make actual cookies (objects). All cookies have the same shape but can have different flavors!";
    } else if (questionText.includes('database') || questionText.includes('sql')) {
      return "A database is like a huge library 📚. Books are organized on shelves (tables). When you need a book, you ask the librarian (query) and they find it quickly using the catalog (index)!";
    }
    
    // Generic explanation based on answer length
    const sentences = question.answer.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 0) {
      return "In simple words: " + sentences[0].trim() + ". That's the main idea!";
    }
    
    return "This is a technical concept that builds on fundamental programming ideas. Think of it as a tool that solves a specific problem in a clever way!";
  }

  /**
   * Generate real-world analogy for better understanding
   */
  getRealWorldAnalogy(question: InterviewQuestion): { analogy: string; explanation: string } {
    const questionText = question.question.toLowerCase();
    const category = question.category.toLowerCase();
    
    if (questionText.includes('virtual dom') || questionText.includes('reconciliation')) {
      return {
        analogy: "📝 Writing vs. Publishing a Document",
        explanation: "Imagine editing a long document. Instead of printing every tiny change, you make all edits in your draft (Virtual DOM), then print once when done (Real DOM update). Much faster than printing 100 times!"
      };
    } else if (questionText.includes('middleware')) {
      return {
        analogy: "🛂 Airport Security Checkpoints",
        explanation: "Before boarding a plane (reaching your destination), you pass through security checks, customs, baggage scan. Each checkpoint is middleware - inspecting and processing you before you continue!"
      };
    } else if (questionText.includes('callback') || questionText.includes('event')) {
      return {
        analogy: "🔔 Doorbell Notification System",
        explanation: "You don't stare at the door waiting for guests. You install a doorbell! When someone arrives, it rings (callback fires) and you respond. You were free to do other things until that moment."
      };
    } else if (questionText.includes('cache') || questionText.includes('memoization')) {
      return {
        analogy: "📒 Keeping a Cheat Sheet",
        explanation: "Instead of solving the same math problem repeatedly, you write the answer in a notebook. Next time you need it, you just look it up! That's caching - store results for quick access."
      };
    } else if (questionText.includes('recursion')) {
      return {
        analogy: "🪆 Russian Nesting Dolls",
        explanation: "Each doll contains a smaller doll inside. You keep opening until you find the tiniest one (base case), then close them back up. That's recursion - solving by breaking into smaller versions!"
      };
    } else if (questionText.includes('dependency injection')) {
      return {
        analogy: "🔌 Bringing Your Own Charger",
        explanation: "Instead of having a built-in battery, your device accepts any compatible charger you plug in (inject). This makes it flexible - you can swap chargers without changing the device!"
      };
    } else if (questionText.includes('authentication') || questionText.includes('authorization')) {
      return {
        analogy: "🎫 Concert Ticket & VIP Pass",
        explanation: "Authentication = showing your ticket to enter (proving who you are). Authorization = showing your VIP pass to access backstage (proving what you can do). Identity vs. Permission!"
      };
    } else if (questionText.includes('webhook')) {
      return {
        analogy: "📞 Emergency Contact Number",
        explanation: "You give someone your number and say 'call me when the package arrives.' They don't need to constantly check - they just call when it happens. That's a webhook!"
      };
    }
    
    return {
      analogy: "🎯 Problem-Solution Pattern",
      explanation: "Every programming concept is like a specialized tool. Just as you use a hammer for nails and a screwdriver for screws, this concept is the right tool for specific programming challenges!"
    };
  }

  /**
   * Extract technical terms from answer for interactive glossary
   */
  getTechnicalTerms(question: InterviewQuestion): Array<{ term: string; definition: string }> {
    const answer = question.answer;
    const terms: Array<{ term: string; definition: string }> = [];
    
    // Common technical terms with simple definitions
    const glossary: { [key: string]: string } = {
      'closure': 'A function that remembers variables from its outer scope even after the outer function finishes',
      'hoisting': 'JavaScript behavior where variable/function declarations are moved to the top before code execution',
      'prototype': 'A template object from which other objects inherit properties and methods',
      'promise': 'An object representing a value that will be available in the future (async operation result)',
      'async/await': 'Modern syntax to write asynchronous code that looks like synchronous code',
      'callback': 'A function passed as an argument to another function, to be executed later',
      'middleware': 'Software that sits between request and response, processing data along the way',
      'api': 'Application Programming Interface - a way for programs to talk to each other',
      'rest': 'REpresentational State Transfer - architectural style for building web services',
      'crud': 'Create, Read, Update, Delete - the four basic database operations',
      'jwt': 'JSON Web Token - a secure way to transmit information between parties as a JSON object',
      'cors': 'Cross-Origin Resource Sharing - mechanism for making requests to different domains',
      'component': 'A reusable, self-contained piece of UI with its own logic and styling',
      'state': 'Data that determines how a component renders and behaves at any given time',
      'props': 'Properties passed from parent to child components (like function parameters)',
      'virtual dom': 'A lightweight copy of the real DOM kept in memory for efficient updates',
      'hook': 'A special function that lets you use React features in functional components',
      'dependency injection': 'Design pattern where objects receive dependencies from external sources',
      'singleton': 'Design pattern ensuring a class has only one instance throughout the application',
      'polymorphism': 'Ability of objects to take on multiple forms - same interface, different implementations',
      'abstraction': 'Hiding complex implementation details and showing only essential features',
      'encapsulation': 'Bundling data and methods together, hiding internal details from outside',
      'inheritance': 'Mechanism where a class inherits properties and methods from another class',
      'recursion': 'Function calling itself to solve a problem by breaking it into smaller subproblems',
      'memoization': 'Optimization technique storing expensive function call results for reuse',
      'debounce': 'Limiting function execution by waiting until a pause in rapid calls',
      'throttle': 'Limiting function execution to once per specified time period',
      'immutable': 'Data that cannot be changed after creation - you create new versions instead',
      'pure function': 'Function that always returns the same output for the same input, no side effects',
      'side effect': 'Any change to state outside the function or interaction with the outside world'
    };
    
    const answerLower = answer.toLowerCase();
    
    // Find terms present in the answer
    for (const [term, definition] of Object.entries(glossary)) {
      const regex = new RegExp('\\b' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      if (regex.test(answer)) {
        terms.push({ term: term.charAt(0).toUpperCase() + term.slice(1), definition });
      }
    }
    
    return terms.slice(0, 6); // Return max 6 terms
  }

  /**
   * Get visual learning hints for better understanding
   */
  getVisualLearningHints(question: InterviewQuestion): Array<{ icon: string; hint: string }> {
    const questionText = question.question.toLowerCase();
    const hints: Array<{ icon: string; hint: string }> = [];
    
    if (questionText.includes('array') || questionText.includes('data structure')) {
      hints.push({ icon: '📊', hint: 'Visualize as boxes in a row, each numbered starting from 0' });
      hints.push({ icon: '👉', hint: 'Draw arrows showing how elements connect or flow' });
    }
    
    if (questionText.includes('tree') || questionText.includes('hierarchy')) {
      hints.push({ icon: '🌳', hint: 'Sketch as a tree: root at top, branches spreading down' });
      hints.push({ icon: '👨‍👩‍👧‍👦', hint: 'Think family tree: parents, children, siblings, ancestors' });
    }
    
    if (questionText.includes('flow') || questionText.includes('process') || questionText.includes('lifecycle')) {
      hints.push({ icon: '➡️', hint: 'Draw a flowchart with arrows showing step-by-step progression' });
      hints.push({ icon: '🔄', hint: 'Use circles for loops, diamonds for decisions' });
    }
    
    if (questionText.includes('compare') || questionText.includes('difference')) {
      hints.push({ icon: '⚖️', hint: 'Create a comparison table with two columns' });
      hints.push({ icon: '🆚', hint: 'List pros/cons side by side for each option' });
    }
    
    if (questionText.includes('stack') || questionText.includes('queue')) {
      hints.push({ icon: '📚', hint: 'Stack = pile of books (last on top comes off first)' });
      hints.push({ icon: '🎫', hint: 'Queue = waiting in line (first person in gets served first)' });
    }
    
    if (questionText.includes('closure') || questionText.includes('scope')) {
      hints.push({ icon: '🎁', hint: 'Draw nested boxes: inner box can see outer, not vice versa' });
      hints.push({ icon: '🏠', hint: 'Think rooms in a house: child room inside parent room' });
    }
    
    if (questionText.includes('async') || questionText.includes('promise')) {
      hints.push({ icon: '⏰', hint: 'Use timeline diagram showing parallel activities' });
      hints.push({ icon: '🎬', hint: 'Storyboard showing: start → waiting → result arrives → handle' });
    }
    
    if (questionText.includes('inheritance') || questionText.includes('extends')) {
      hints.push({ icon: '🧬', hint: 'Draw parent-child relationship with arrows pointing down' });
      hints.push({ icon: '📋', hint: 'Child inherits parent properties + adds their own' });
    }
    
    // Generic hints if none matched
    if (hints.length === 0) {
      hints.push({ icon: '✏️', hint: 'Draw it out! Visual representation helps memory retention' });
      hints.push({ icon: '🗺️', hint: 'Create a mind map connecting related concepts' });
      hints.push({ icon: '📝', hint: 'Write the concept in your own words with examples' });
    }
    
    return hints.slice(0, 3);
  }

  /**
   * Get complexity level explanation (beginner/intermediate/expert)
   */
  getComplexityExplanation(question: InterviewQuestion, level: 'beginner' | 'intermediate' | 'expert'): string {
    const sentences = question.answer.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    if (level === 'beginner') {
      // Simplify: use first 2 sentences, remove jargon
      return sentences.slice(0, 2).join('. ') + '. 💡 Start with this basic understanding and build from here!';
    } else if (level === 'intermediate') {
      // Moderate: use first half of answer
      const mid = Math.ceil(sentences.length / 2);
      return sentences.slice(0, mid).join('. ') + '. 📚 This covers the core concepts you need to know.';
    } else {
      // Expert: full answer with technical depth
      return question.answer + ' 🎓 This is the complete technical explanation with all nuances.';
    }
  }

  toggleELI5(questionId: number): void {
    this.showELI5.set(questionId, !this.showELI5.get(questionId));
  }

  isELI5Visible(questionId: number): boolean {
    return this.showELI5.get(questionId) || false;
  }

  toggleVisualHints(questionId: number): void {
    this.showVisualHints.set(questionId, !this.showVisualHints.get(questionId));
  }

  isVisualHintsVisible(questionId: number): boolean {
    return this.showVisualHints.get(questionId) || false;
  }

  setComplexityLevel(questionId: number, level: 'beginner' | 'intermediate' | 'expert'): void {
    this.complexityLevels.set(questionId, level);
  }

  getComplexityLevel(questionId: number): 'beginner' | 'intermediate' | 'expert' {
    return this.complexityLevels.get(questionId) || 'intermediate';
  }

  selectTerm(questionId: number, term: string | null): void {
    this.selectedTerms.set(questionId, term);
  }

  getSelectedTerm(questionId: number): string | null {
    return this.selectedTerms.get(questionId) || null;
  }

  getSelectedTermDefinition(question: InterviewQuestion): string {
    const selectedTerm = this.getSelectedTerm(question.id);
    if (!selectedTerm) return '';
    const term = this.getTechnicalTerms(question).find(t => t.term === selectedTerm);
    return term ? term.definition : '';
  }

  getFormattedAnswer(question: InterviewQuestion): string {
    const level = this.getComplexityLevel(question.id);
    if (level === 'intermediate' || level === 'expert') {
      return this.formatAnswerHTML(question.answer);
    } else {
      return this.formatAnswerHTML(this.getComplexityExplanation(question, level));
    }
  }

  /**
   * AI-generated summary/TLDR of the answer
   */
  getAISummary(question: InterviewQuestion): string {
    const answer = question.answer;
    const sentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    // Take first 2-3 sentences as summary
    const summaryLength = Math.min(2, sentences.length);
    return sentences.slice(0, summaryLength).join('. ').trim() + '.';
  }

  /**
   * AI-generated key takeaways from the answer
   */
  getAIKeyTakeaways(question: InterviewQuestion): string[] {
    const answer = question.answer;
    const takeaways: string[] = [];
    
    // Look for numbered points or bullet points
    const numberedMatches = answer.match(/\d+[\.\)]\s+([^.\n]+)/g);
    if (numberedMatches && numberedMatches.length > 0) {
      return numberedMatches.slice(0, 3).map(m => m.replace(/^\d+[\.\)]\s+/, '').trim());
    }
    
    // Look for bullet points
    const bulletMatches = answer.match(/[-•]\s+([^.\n]+)/g);
    if (bulletMatches && bulletMatches.length > 0) {
      return bulletMatches.slice(0, 3).map(m => m.replace(/^[-•]\s+/, '').trim());
    }
    
    // Extract important sentences with keywords
    const sentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 30);
    const keywords = ['allows', 'enables', 'provides', 'helps', 'ensures', 'implements', 'used for', 'benefits'];
    
    sentences.forEach(sentence => {
      if (takeaways.length < 3 && keywords.some(kw => sentence.toLowerCase().includes(kw))) {
        takeaways.push(sentence.trim());
      }
    });
    
    return takeaways.length > 0 ? takeaways : sentences.slice(0, 3);
  }

  /**
   * AI-generated follow-up questions
   */
  getAIFollowUpQuestions(question: InterviewQuestion): string[] {
    const category = question.category;
    const difficulty = question.difficulty;
    const followUps: string[] = [];
    
    // Generic follow-up patterns based on category
    if (category.includes('Angular')) {
      followUps.push(`How does this compare to other Angular features?`);
      followUps.push(`What are the best practices for implementing this in Angular?`);
      followUps.push(`Can you show a real-world example in an Angular application?`);
    } else if (category.includes('Design Pattern')) {
      followUps.push(`When should you use this pattern vs alternatives?`);
      followUps.push(`What are the trade-offs of this design pattern?`);
      followUps.push(`Can you show a code example implementing this pattern?`);
    } else if (category.includes('.NET') || category.includes('C#')) {
      followUps.push(`How is this implemented in .NET Core vs .NET Framework?`);
      followUps.push(`What are the performance implications?`);
      followUps.push(`Are there any common pitfalls to avoid?`);
    } else {
      followUps.push(`Can you explain this with a practical example?`);
      followUps.push(`What are common use cases for this?`);
      followUps.push(`How does this relate to other concepts in ${category}?`);
    }
    
    return followUps.slice(0, 3);
  }

  /**
   * AI learning difficulty breakdown
   */
  getAILearningPath(question: InterviewQuestion): { label: string; percentage: number }[] {
    const complexity = this.getAIComplexityScore(question);
    
    return [
      { label: 'Theory', percentage: complexity >= 3 ? 40 : 60 },
      { label: 'Practice', percentage: complexity >= 3 ? 35 : 25 },
      { label: 'Real-world', percentage: complexity >= 3 ? 25 : 15 }
    ];
  }

  /**
   * AI-generated common mistakes
   */
  getAICommonMistakes(question: InterviewQuestion): string[] {
    const answer = question.answer.toLowerCase();
    const mistakes: string[] = [];
    
    // Look for negative patterns in the answer
    const patterns = [
      { regex: /avoid\s+([^.]+)/gi, found: answer.match(/avoid\s+([^.]+)/gi) },
      { regex: /don't\s+([^.]+)/gi, found: answer.match(/don't\s+([^.]+)/gi) },
      { regex: /never\s+([^.]+)/gi, found: answer.match(/never\s+([^.]+)/gi) },
      { regex: /mistake\s+([^.]+)/gi, found: answer.match(/mistake\s+([^.]+)/gi) }
    ];
    
    patterns.forEach(p => {
      if (p.found && mistakes.length < 3) {
        p.found.forEach(match => {
          if (mistakes.length < 3) {
            mistakes.push(match.trim());
          }
        });
      }
    });
    
    // Default mistakes if none found
    if (mistakes.length === 0) {
      mistakes.push('Not understanding the core concept thoroughly');
      mistakes.push('Skipping practical implementation examples');
      mistakes.push('Not considering edge cases and limitations');
    }
    
    return mistakes.slice(0, 3);
  }

  /**
   * AI confidence score for answer quality
   */
  getAIConfidenceScore(question: InterviewQuestion): number {
    let score = 0;
    const answer = question.answer;
    
    // Check answer length (good answers are detailed)
    if (answer.length > 300) score += 25;
    else if (answer.length > 150) score += 15;
    else score += 5;
    
    // Check for code examples
    if (/```|`[^`]+`/.test(answer)) score += 25;
    
    // Check for structure (lists, numbered items)
    if (/\n[\d\-•]/.test(answer)) score += 20;
    
    // Check for examples or use cases
    if (/example|use case|scenario/i.test(answer)) score += 15;
    
    // Check for comparisons or alternatives
    if (/compare|versus|alternative|vs/i.test(answer)) score += 15;
    
    return Math.min(score, 100);
  }

  /**
   * AI study recommendation based on user's current filter
   */
  getAIStudyRecommendation(): string {
    if (this.selectedDifficulty === 'Easy') {
      return '🎯 Focus on understanding fundamentals. Move to Medium when comfortable.';
    } else if (this.selectedDifficulty === 'Hard') {
      return '🚀 Advanced level! Make sure you have strong basics. Consider reviewing Medium topics.';
    } else if (this.selectedCategory !== 'all') {
      return `📚 Deep diving into ${this.selectedCategory}. Great for specialization!`;
    } else {
      return '✨ Exploring all topics. Consider focusing on one category for better retention.';
    }
  }

  get statistics() {
    return {
      total: this.questions.length,
      easy: this.questions.filter(q => q.difficulty === 'Easy').length,
      medium: this.questions.filter(q => q.difficulty === 'Medium').length,
      hard: this.questions.filter(q => q.difficulty === 'Hard').length,
      categories: this.categories.length
    };
  }

  get aiInsights() {
    const avgComplexity = this.filteredQuestions.length > 0
      ? this.filteredQuestions.reduce((sum, q) => sum + this.getAIComplexityScore(q), 0) / this.filteredQuestions.length
      : 0;
    
    const totalReadingTime = this.filteredQuestions.reduce((sum, q) => sum + this.getAIReadingTime(q), 0);
    
    return {
      averageComplexity: avgComplexity.toFixed(1),
      totalReadingTime: totalReadingTime,
      recommendation: this.getAIRecommendation()
    };
  }

  private getAIRecommendation(): string {
    if (this.filteredQuestions.length === 0) return 'No questions to analyze';
    
    const easyCount = this.filteredQuestions.filter(q => q.difficulty === 'Easy').length;
    const hardCount = this.filteredQuestions.filter(q => q.difficulty === 'Hard').length;
    
    if (easyCount > this.filteredQuestions.length * 0.6) {
      return '💡 Great for beginners! Start here to build your foundation.';
    } else if (hardCount > this.filteredQuestions.length * 0.5) {
      return '🔥 Advanced content! Make sure you understand the basics first.';
    } else {
      return '✨ Well-balanced mix! Perfect for comprehensive learning.';
    }
  }

  /**
   * Logout and redirect to home page
   */
  logout(): void {
    if (confirm('Are you sure you want to logout?')) {
      this.authService.logout();
      this.router.navigate(['/home']);
    }
  }

  /**
   * AI-powered answer formatting for better readability
   * Converts formatted text to clean, structured HTML
   */
  formatAnswerHTML(answer: string): string {
    if (!answer) return '';

    let html = answer.trim();

    // 1. Protect code blocks first
    const codeBlocks: string[] = [];
    html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
      codeBlocks.push(code.trim());
      return `___CODE_BLOCK_${codeBlocks.length - 1}___`;
    });

    // 2. Convert **bold** text
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // 3. Convert inline `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 4. Split into lines and process
    const lines = html.split('\n');
    const processedLines: string[] = [];
    let inList = false;
    let inNumberedList = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      if (!line) {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        if (inNumberedList) {
          processedLines.push('</ol>');
          inNumberedList = false;
        }
        processedLines.push('<div class="spacer"></div>');
        continue;
      }

      // Section headings (lines ending with :)
      if (line.match(/^[A-Z][^:]+:$/)) {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        if (inNumberedList) {
          processedLines.push('</ol>');
          inNumberedList = false;
        }
        processedLines.push(`<h4 class="section-heading">${line}</h4>`);
        continue;
      }

      // Bullet points
      if (line.match(/^[\u2022\u2713\u2717-]\s+/)) {
        if (!inList) {
          if (inNumberedList) {
            processedLines.push('</ol>');
            inNumberedList = false;
          }
          processedLines.push('<ul class="styled-list">');
          inList = true;
        }
        const text = line.replace(/^[\u2022\u2713\u2717-]\s+/, '');
        processedLines.push(`<li>${text}</li>`);
        continue;
      }

      // Numbered lists
      if (line.match(/^\d+[\.\)]\s+/)) {
        if (!inNumberedList) {
          if (inList) {
            processedLines.push('</ul>');
            inList = false;
          }
          processedLines.push('<ol class="numbered-list">');
          inNumberedList = true;
        }
        const text = line.replace(/^\d+[\.\)]\s+/, '');
        processedLines.push(`<li>${text}</li>`);
        continue;
      }

      // Regular paragraphs
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      if (inNumberedList) {
        processedLines.push('</ol>');
        inNumberedList = false;
      }
      processedLines.push(`<p>${line}</p>`);
    }

    // Close any open lists
    if (inList) processedLines.push('</ul>');
    if (inNumberedList) processedLines.push('</ol>');

    html = processedLines.join('\n');

    // 5. Restore code blocks
    codeBlocks.forEach((code, index) => {
      html = html.replace(
        `___CODE_BLOCK_${index}___`,
        `<pre class="code-block"><code>${this.escapeHtml(code)}</code></pre>`
      );
    });

    return html;
  }

  /**
   * Escape HTML entities
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============ NEW AI FEATURES ============

  /**
   * Toggle bookmark for a question
   */
  toggleBookmark(questionId: number): void {
    if (this.bookmarkedQuestions.has(questionId)) {
      this.bookmarkedQuestions.delete(questionId);
    } else {
      this.bookmarkedQuestions.add(questionId);
    }
    this.saveUserProgress();
  }

  isBookmarked(questionId: number): boolean {
    return this.bookmarkedQuestions.has(questionId);
  }

  /**
   * Mark question as read/studied
   */
  markAsStudied(questionId: number): void {
    this.studyProgress.set(questionId, 100);
    this.saveUserProgress();
  }

  getStudyProgress(questionId: number): number {
    return this.studyProgress.get(questionId) || 0;
  }

  /**
   * Text-to-Speech for answer
   */
  speakAnswer(question: InterviewQuestion): void {
    if ('speechSynthesis' in window) {
      if (this.currentSpeakingQuestion === question.id) {
        // Stop speaking
        window.speechSynthesis.cancel();
        this.currentSpeakingQuestion = null;
      } else {
        // Start speaking
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(question.answer);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.onend = () => {
          this.currentSpeakingQuestion = null;
        };
        window.speechSynthesis.speak(utterance);
        this.currentSpeakingQuestion = question.id;
      }
    }
  }

  isSpeaking(questionId: number): boolean {
    return this.currentSpeakingQuestion === questionId;
  }

  /**
   * AI Study Plan Generator
   */
  generateStudyPlan(): { day: number; topics: string[]; duration: string }[] {
    const plan: { day: number; topics: string[]; duration: string }[] = [];
    const categories = [...this.categories];
    
    categories.forEach((cat, index) => {
      const questionsInCat = this.questions.filter(q => q.category === cat);
      const totalTime = questionsInCat.reduce((sum, q) => sum + this.getAIReadingTime(q), 0);
      
      plan.push({
        day: index + 1,
        topics: [cat, `${questionsInCat.length} questions`],
        duration: `${totalTime} min`
      });
    });
    
    return plan;
  }

  /**
   * AI Personalized Recommendations
   */
  getPersonalizedRecommendations(): InterviewQuestion[] {
    // Recommend questions based on:
    // 1. Not yet studied
    // 2. Related to bookmarked questions
    // 3. Appropriate difficulty level
    
    const unstudied = this.questions.filter(q => !this.studyProgress.has(q.id));
    const bookmarkedCategories = Array.from(this.bookmarkedQuestions)
      .map(id => this.questions.find(q => q.id === id)?.category)
      .filter(cat => cat !== undefined);
    
    const recommended = unstudied.filter(q => 
      bookmarkedCategories.includes(q.category)
    );
    
    return recommended.slice(0, 5);
  }

  /**
   * AI Quiz Mode - Generate quiz from current questions
   */
  generateQuiz(): { question: string; options: string[]; correctAnswer: string }[] {
    const quiz: { question: string; options: string[]; correctAnswer: string }[] = [];
    
    this.filteredQuestions.slice(0, 5).forEach(q => {
      const quizItem = {
        question: q.question,
        options: [
          'Option A: ' + q.answer.substring(0, 50) + '...',
          'Option B: Random option',
          'Option C: Another option',
          'Option D: Different answer'
        ],
        correctAnswer: 'A'
      };
      quiz.push(quizItem);
    });
    
    return quiz;
  }

  /**
   * Get study statistics
   */
  get studyStats() {
    const totalQuestions = this.questions.length;
    const studiedQuestions = this.studyProgress.size;
    const bookmarks = this.bookmarkedQuestions.size;
    const progressPercentage = totalQuestions > 0 
      ? Math.round((studiedQuestions / totalQuestions) * 100) 
      : 0;
    
    return {
      total: totalQuestions,
      studied: studiedQuestions,
      remaining: totalQuestions - studiedQuestions,
      bookmarks: bookmarks,
      progress: progressPercentage,
      timeSpent: this.formatTime(this.studyTimeSpent),
      streak: this.learningStreak
    };
  }

  /**
   * Format seconds to readable time
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * AI Smart Search with relevance scoring
   */
  getSearchRelevance(question: InterviewQuestion): number {
    if (!this.searchTerm) return 100;
    
    const term = this.searchTerm.toLowerCase();
    let score = 0;
    
    // Question match (highest priority)
    if (question.question.toLowerCase().includes(term)) score += 50;
    
    // Category match
    if (question.category.toLowerCase().includes(term)) score += 30;
    
    // Answer match
    if (question.answer.toLowerCase().includes(term)) score += 20;
    
    return score;
  }

  /**
   * AI Difficulty Predictor for next question
   */
  predictNextDifficulty(): string {
    const recentStudied = Array.from(this.studyProgress.keys())
      .slice(-5)
      .map(id => this.questions.find(q => q.id === id))
      .filter(q => q !== undefined);
    
    if (recentStudied.length === 0) return 'Easy';
    
    const easyCount = recentStudied.filter(q => q!.difficulty === 'Easy').length;
    const hardCount = recentStudied.filter(q => q!.difficulty === 'Hard').length;
    
    if (easyCount >= 3) return 'Medium';
    if (hardCount >= 2) return 'Medium';
    return 'Hard';
  }

  /**
   * Toggle AI Assistant
   */
  toggleAIAssistant(): void {
    this.showAIAssistant = !this.showAIAssistant;
  }

  /**
   * Get mastery level for a category
   */
  getCategoryMastery(category: string): number {
    const categoryQuestions = this.questions.filter(q => q.category === category);
    const studiedInCategory = categoryQuestions.filter(q => 
      this.studyProgress.has(q.id)
    ).length;
    
    return categoryQuestions.length > 0
      ? Math.round((studiedInCategory / categoryQuestions.length) * 100)
      : 0;
  }
}

