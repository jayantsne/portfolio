import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { QuestionsDataService, InterviewQuestion } from '../shared/questions-data.service';
import { trigger, state, style, transition, animate } from '@angular/animations';

interface QuestCard {
  question: InterviewQuestion;
  x: number;
  y: number;
  rotation: number;
  opacity: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}

interface BattleStats {
  score: number;
  streak: number;
  lives: number;
  timeLeft: number;
  combo: number;
}

@Component({
  selector: 'app-learn-quest',
  templateUrl: './learn-quest.component.html',
  styleUrls: ['./learn-quest.component.css'],
  animations: [
    trigger('cardSwipe', [
      state('center', style({ transform: 'translateX(0) rotate(0deg)', opacity: 1 })),
      state('right', style({ transform: 'translateX(400px) rotate(30deg)', opacity: 0 })),
      state('left', style({ transform: 'translateX(-400px) rotate(-30deg)', opacity: 0 })),
      transition('center => right', animate('300ms ease-out')),
      transition('center => left', animate('300ms ease-out')),
    ]),
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('300ms', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('200ms', style({ opacity: 0, transform: 'scale(0.8)' }))
      ])
    ]),
    trigger('bounceIn', [
      transition(':enter', [
        style({ transform: 'scale(0)' }),
        animate('500ms cubic-bezier(0.68, -0.55, 0.265, 1.55)', 
          style({ transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class LearnQuestComponent implements OnInit, OnDestroy {
  // Game Modes
  currentMode: 'menu' | 'flashcard' | 'battle' | 'memory-palace' | 'daily-challenge' | 'story-mode' = 'menu';
  
  // Questions Data
  allQuestions: InterviewQuestion[] = [];
  currentQuestions: InterviewQuestion[] = [];
  currentQuestionIndex: number = 0;
  
  // Category Filtering
  selectedCategory: string = 'all';
  availableCategories: string[] = [];
  
  // Flashcard Swipe Mode
  flashcardStack: QuestCard[] = [];
  currentCard?: QuestCard;
  swipeState: 'center' | 'right' | 'left' = 'center';
  knownCards: number = 0;
  unknownCards: number = 0;
  totalCards: number = 0;
  
  // Battle Arena Mode
  battleStats: BattleStats = {
    score: 0,
    streak: 0,
    lives: 3,
    timeLeft: 60,
    combo: 1
  };
  battleActive: boolean = false;
  battleQuestion?: InterviewQuestion;
  battleOptions: string[] = [];
  battleTimer?: any;
  
  // Memory Palace Mode
  memoryRooms: Array<{
    name: string;
    icon: string;
    questions: InterviewQuestion[];
    visited: boolean;
  }> = [];
  currentRoom: number = 0;
  visualStory: string = '';
  
  // Daily Challenge
  dailyChallenge?: {
    date: string;
    questions: InterviewQuestion[];
    completed: boolean;
    streak: number;
  };
  
  // User Progress
  userLevel: number = 1;
  userXP: number = 0;
  userXPToNext: number = 100;
  totalQuestionsCompleted: number = 0;
  
  // Achievements
  achievements: Achievement[] = [
    { id: 'first-win', name: 'First Victory', description: 'Complete your first question', icon: '🎯', unlocked: false, progress: 0, maxProgress: 1 },
    { id: 'speed-demon', name: 'Speed Demon', description: 'Answer 10 questions in under 2 minutes', icon: '⚡', unlocked: false, progress: 0, maxProgress: 10 },
    { id: 'knowledge-seeker', name: 'Knowledge Seeker', description: 'Complete 50 questions', icon: '📚', unlocked: false, progress: 0, maxProgress: 50 },
    { id: 'battle-master', name: 'Battle Master', description: 'Win 10 battle arena rounds', icon: '⚔️', unlocked: false, progress: 0, maxProgress: 10 },
    { id: 'memory-champion', name: 'Memory Champion', description: 'Complete all memory palace rooms', icon: '🏰', unlocked: false, progress: 0, maxProgress: 5 },
    { id: 'streak-king', name: 'Streak King', description: 'Maintain a 7-day streak', icon: '🔥', unlocked: false, progress: 0, maxProgress: 7 },
    { id: 'perfectionist', name: 'Perfectionist', description: 'Get 10 perfect scores in battle mode', icon: '💎', unlocked: false, progress: 0, maxProgress: 10 }
  ];
  
  // Stats
  stats = {
    totalTime: 0,
    questionsAnswered: 0,
    accuracy: 0
  };

  constructor(
    private questionsService: QuestionsDataService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadQuestions();
    this.loadUserProgress();
    this.initializeDailyChallenge();
  }

  ngOnDestroy(): void {
    if (this.battleTimer) {
      clearInterval(this.battleTimer);
    }
  }

  // Load questions from service
  loadQuestions(): void {
    this.questionsService.questions$.subscribe(questions => {
      this.allQuestions = questions;
      
      // Generate AI-powered .NET questions if needed
      this.generateAIDotNetQuestions();
      
      // Extract unique categories
      this.extractCategories();
      
      // Apply initial filter
      this.applyFilter();
    });
  }

  // Extract unique categories from questions
  extractCategories(): void {
    const categories = new Set<string>();
    this.allQuestions.forEach(q => {
      if (q.category) {
        categories.add(q.category);
      }
    });
    this.availableCategories = Array.from(categories).sort();
  }

  // Apply category filter
  applyFilter(): void {
    if (this.selectedCategory === 'all') {
      this.currentQuestions = [...this.allQuestions];
    } else {
      this.currentQuestions = this.allQuestions.filter(q => q.category === this.selectedCategory);
    }
  }

  // Change category and restart mode
  changeCategory(category: string): void {
    this.selectedCategory = category;
    this.applyFilter();
    
    // Refresh current mode if active
    if (this.currentMode === 'flashcard') {
      this.initializeFlashcards();
    }
  }

  // Get question count for a specific category
  getQuestionCountByCategory(category: string): number {
    return this.allQuestions.filter(q => q.category === category).length;
  }

  // AI-Powered .NET Question Generation
  generateAIDotNetQuestions(): void {
    const dotNetCategories = ['.NET Core', 'C#', 'ASP.NET', 'Entity Framework'];
    const hasDotNetQuestions = this.allQuestions.some(q => 
      dotNetCategories.some(cat => q.category?.includes(cat))
    );

    // If we don't have enough .NET questions, generate AI-powered ones
    if (!hasDotNetQuestions || this.allQuestions.filter(q => 
      dotNetCategories.some(cat => q.category?.includes(cat))
    ).length < 10) {
      const aiGeneratedQuestions = this.generateDotNetQuestionsAI();
      this.allQuestions = [...this.allQuestions, ...aiGeneratedQuestions];
      this.currentQuestions = [...this.allQuestions];
    }
  }

  // Generate .NET questions using AI patterns
  generateDotNetQuestionsAI(): InterviewQuestion[] {
    const dotNetQuestions: InterviewQuestion[] = [
      {
        id: Date.now() + 1,
        question: 'What is the difference between .NET Framework and .NET Core?',
        answer: '.NET Framework is Windows-only and monolithic, while .NET Core is cross-platform (Windows, Linux, macOS), open-source, and modular. .NET Core is faster, more lightweight, and designed for modern cloud-based applications. Key differences: Deployment (Framework=Windows only, Core=cross-platform), Performance (Core is faster), Modularity (Core uses NuGet packages), and Future (Core is the future, now unified as .NET 5+).',
        category: '.NET Core',
        difficulty: 'Medium',
        tags: ['.NET', 'Framework', 'Core'],
        expanded: false
      },
      {
        id: Date.now() + 2,
        question: 'Explain Dependency Injection in ASP.NET Core',
        answer: 'Dependency Injection (DI) is a design pattern built into ASP.NET Core that manages object dependencies. Instead of creating dependencies manually, you register services in Startup.ConfigureServices() and inject them via constructor. Benefits: Loose coupling, easier testing, better maintainability. Three lifetimes: Singleton (one instance), Scoped (per request), Transient (new instance each time). Example: services.AddScoped<IMyService, MyService>() then inject via constructor.',
        category: 'ASP.NET',
        difficulty: 'Medium',
        tags: ['DI', 'ASP.NET Core', 'Design Pattern'],
        expanded: false
      },
      {
        id: Date.now() + 3,
        question: 'What are async/await keywords in C# and when to use them?',
        answer: 'async/await enables asynchronous programming in C#. async marks a method as asynchronous, await pauses execution until task completes without blocking the thread. Use cases: I/O operations (file, database, API calls), long-running tasks, improving UI responsiveness. Benefits: Non-blocking execution, better scalability, efficient thread usage. Example: async Task<string> GetDataAsync() { return await httpClient.GetStringAsync(url); }. Important: Always use await with async methods, return Task or Task<T>.',
        category: 'C#',
        difficulty: 'Medium',
        tags: ['Async', 'C#', 'Threading'],
        expanded: false
      },
      {
        id: Date.now() + 4,
        question: 'Explain LINQ and its advantages in C#',
        answer: 'LINQ (Language Integrated Query) provides a consistent way to query data from different sources (collections, databases, XML) using C# syntax. Two syntaxes: Query syntax (SQL-like) and Method syntax (lambda expressions). Advantages: Strongly typed, IntelliSense support, compile-time checking, readable code, works with multiple data sources. Common operations: Where (filter), Select (project), OrderBy (sort), GroupBy (group), Join (combine). Example: var results = list.Where(x => x.Age > 18).OrderBy(x => x.Name);',
        category: 'C#',
        difficulty: 'Medium',
        tags: ['LINQ', 'C#', 'Query'],
        expanded: false
      },
      {
        id: Date.now() + 5,
        question: 'What is Entity Framework Core and its advantages?',
        answer: 'Entity Framework Core (EF Core) is an ORM (Object-Relational Mapper) for .NET Core that maps C# objects to database tables. Advantages: Database-agnostic (SQL Server, PostgreSQL, MySQL), LINQ queries, automatic migrations, change tracking, lazy/eager loading. Code-First approach: Define models in C#, EF creates database. Database-First: Generate models from existing database. Key features: DbContext (session), DbSet<T> (table), migrations (version control for schema), CRUD operations without SQL.',
        category: 'Entity Framework',
        difficulty: 'Medium',
        tags: ['EF Core', 'ORM', 'Database'],
        expanded: false
      },
      {
        id: Date.now() + 6,
        question: 'What are Middleware in ASP.NET Core?',
        answer: 'Middleware are software components assembled into a request pipeline to handle requests and responses. Each middleware: (1) Performs operations on HttpContext, (2) Decides to pass request to next middleware or short-circuit. Order matters! Common middleware: Authentication, Authorization, Static Files, Routing, CORS. Custom middleware: app.Use(async (context, next) => { /* before */ await next(); /* after */ }). Built-in: app.UseAuthentication(), app.UseRouting(), app.UseEndpoints(). Pipeline executes in order registered.',
        category: 'ASP.NET',
        difficulty: 'Hard',
        tags: ['Middleware', 'ASP.NET Core', 'Pipeline'],
        expanded: false
      },
      {
        id: Date.now() + 7,
        question: 'Explain the difference between IEnumerable and IQueryable in C#',
        answer: 'IEnumerable: In-memory collection, executes queries client-side, suitable for LINQ to Objects, uses deferred execution, all data loaded then filtered. IQueryable: Database queries, executes server-side, translates to SQL, better performance for large datasets, inherits from IEnumerable. Key difference: IQueryable builds expression tree and executes on database (efficient), IEnumerable loads all data then filters (inefficient for large data). Use IQueryable for database queries, IEnumerable for in-memory collections.',
        category: 'C#',
        difficulty: 'Hard',
        tags: ['IEnumerable', 'IQueryable', 'LINQ'],
        expanded: false
      },
      {
        id: Date.now() + 8,
        question: 'What are Action Filters in ASP.NET Core MVC?',
        answer: 'Action Filters are attributes that run code before/after controller action execution. Types: Authorization (runs first), Resource (after authorization), Action (before/after action), Exception (handle errors), Result (before/after result execution). Use cases: Logging, validation, caching, error handling. Implementation: Inherit from ActionFilterAttribute, override OnActionExecuting/OnActionExecuted. Example: [CustomFilter] public IActionResult Index(). Can be applied globally, to controller, or to action. Execution order: Authorization → Resource → Action → Exception → Result.',
        category: 'ASP.NET',
        difficulty: 'Hard',
        tags: ['Filters', 'MVC', 'ASP.NET Core'],
        expanded: false
      },
      {
        id: Date.now() + 9,
        question: 'What is the difference between Task and Thread in C#?',
        answer: 'Thread: OS-level construct, heavyweight, limited by CPU cores, manually managed, blocking. Task: Higher-level abstraction, lightweight, uses ThreadPool, managed by TPL (Task Parallel Library), supports async/await. Key differences: Tasks are more efficient (reuse threads), better for I/O operations, easier error handling, composable with ContinueWith/await. Thread: new Thread(() => {}).Start(). Task: Task.Run(() => {}). Use Tasks for modern async programming, Threads only for low-level scenarios requiring dedicated threads.',
        category: 'C#',
        difficulty: 'Hard',
        tags: ['Task', 'Thread', 'Async', 'TPL'],
        expanded: false
      },
      {
        id: Date.now() + 10,
        question: 'Explain Value Types vs Reference Types in C#',
        answer: 'Value Types: Stored on stack, contain actual data, examples: int, bool, struct, enum. Copied by value (new copy created). Reference Types: Stored on heap, contain reference to data, examples: class, interface, string, arrays. Copied by reference (both point to same object). Key differences: Memory (stack vs heap), Default (value types=default value, reference=null), Performance (value types faster for small data), Assignment (copy vs reference). Boxing: Value → Reference. Unboxing: Reference → Value. Choose based on size and semantics.',
        category: 'C#',
        difficulty: 'Medium',
        tags: ['Value Types', 'Reference Types', 'Memory'],
        expanded: false
      },
      {
        id: Date.now() + 11,
        question: 'What is SignalR and when would you use it?',
        answer: 'SignalR is a library for adding real-time web functionality to ASP.NET Core apps. Enables server to push content to clients instantly (bi-directional communication). Uses WebSockets when available, falls back to Server-Sent Events or Long Polling. Use cases: Chat applications, live dashboards, real-time notifications, collaborative editing, gaming, live feeds. Features: Automatic connection management, broadcast to all/specific clients, grouping. Hub pattern: Server-side hub, client calls hub methods. Example: await Clients.All.SendAsync("ReceiveMessage", message).',
        category: 'ASP.NET',
        difficulty: 'Hard',
        tags: ['SignalR', 'Real-time', 'WebSockets'],
        expanded: false
      },
      {
        id: Date.now() + 12,
        question: 'What are the SOLID principles and how do they apply to C#?',
        answer: 'SOLID is 5 design principles for maintainable OOP code: (S) Single Responsibility - Class has one reason to change. (O) Open/Closed - Open for extension, closed for modification (use inheritance/interfaces). (L) Liskov Substitution - Derived classes substitutable for base class. (I) Interface Segregation - Many specific interfaces better than one general. (D) Dependency Inversion - Depend on abstractions, not concretions (use DI). C# examples: SRP=separate concerns, OCP=use virtual/abstract, LSP=proper inheritance, ISP=small focused interfaces, DIP=inject IService not Service.',
        category: 'C#',
        difficulty: 'Hard',
        tags: ['SOLID', 'Design Principles', 'OOP'],
        expanded: false
      },
      {
        id: Date.now() + 13,
        question: 'Explain Model Binding in ASP.NET Core MVC',
        answer: 'Model Binding automatically maps HTTP request data to action method parameters. Sources: Form data, Route values, Query strings, Request body (JSON). Binding order: Form → Route → Query → Body. Complex objects: Maps properties by name. Attributes: [FromBody] (JSON), [FromRoute] (URL), [FromQuery] (query string), [FromForm] (form data). Custom binding: Implement IModelBinder. Validation: Use Data Annotations ([Required], [Range]). ModelState.IsValid checks validation. Example: public IActionResult Create([FromBody] Product product).',
        category: 'ASP.NET',
        difficulty: 'Medium',
        tags: ['Model Binding', 'MVC', 'ASP.NET Core'],
        expanded: false
      },
      {
        id: Date.now() + 14,
        question: 'What is the Repository Pattern and why use it with Entity Framework?',
        answer: 'Repository Pattern abstracts data access logic, creating a layer between business logic and data access. Benefits: Separation of concerns, easier testing (mock repositories), centralized data logic, database independence. With EF: Wrap DbContext operations in repository interface. Example: IRepository<T> with GetAll(), GetById(), Add(), Update(), Delete(). Unit of Work pattern often used together to manage transactions. Advantages: Testability (inject mock repository), flexibility (swap data access), cleaner controllers. Disadvantage: Extra abstraction layer (some debate if needed with EF).',
        category: 'Entity Framework',
        difficulty: 'Hard',
        tags: ['Repository Pattern', 'EF Core', 'Design Pattern'],
        expanded: false
      },
      {
        id: Date.now() + 15,
        question: 'What are Extension Methods in C# and how to create them?',
        answer: 'Extension Methods add new methods to existing types without modifying them. Requirements: (1) Static class, (2) Static method, (3) First parameter uses "this" keyword. Example: public static class StringExtensions { public static bool IsNullOrEmpty(this string str) { return string.IsNullOrEmpty(str); } }. Usage: myString.IsNullOrEmpty(). Benefits: Enhance existing types, LINQ is built using extension methods, cleaner syntax. Limitations: Cannot override existing methods, cannot access private members. Common use: Add utility methods to built-in types.',
        category: 'C#',
        difficulty: 'Medium',
        tags: ['Extension Methods', 'C#', 'LINQ'],
        expanded: false
      }
    ];

    return dotNetQuestions;
  }

  // Load user progress from localStorage
  loadUserProgress(): void {
    const saved = localStorage.getItem('learnQuestProgress');
    if (saved) {
      const progress = JSON.parse(saved);
      this.userLevel = progress.level || 1;
      this.userXP = progress.xp || 0;
      this.totalQuestionsCompleted = progress.completed || 0;
      this.achievements = progress.achievements || this.achievements;
      this.stats = progress.stats || this.stats;
    }
  }

  // Save user progress to localStorage
  saveUserProgress(): void {
    const progress = {
      level: this.userLevel,
      xp: this.userXP,
      completed: this.totalQuestionsCompleted,
      achievements: this.achievements,
      stats: this.stats
    };
    localStorage.setItem('learnQuestProgress', JSON.stringify(progress));
  }

  // ==================== FLASHCARD SWIPE MODE ====================
  
  startFlashcardMode(): void {
    this.currentMode = 'flashcard';
    this.knownCards = 0;
    this.unknownCards = 0;
    this.currentQuestionIndex = 0;
    this.initializeFlashcards();
  }

  initializeFlashcards(): void {
    this.flashcardStack = this.shuffleArray([...this.currentQuestions])
      .slice(0, 20)
      .map((q, i) => ({
        question: q,
        x: 0,
        y: 0,
        rotation: Math.random() * 4 - 2,
        opacity: 1
      }));
    
    this.totalCards = this.flashcardStack.length;
    
    if (this.flashcardStack.length > 0) {
      this.currentCard = this.flashcardStack[0];
    }
  }

  swipeCard(direction: 'know' | 'dont-know'): void {
    if (!this.currentCard) return;
    
    this.swipeState = direction === 'know' ? 'right' : 'left';
    
    if (direction === 'know') {
      this.knownCards++;
      this.addXP(10);
    } else {
      this.unknownCards++;
      this.addXP(5);
    }
    
    setTimeout(() => {
      this.flashcardStack.shift();
      this.currentQuestionIndex++;
      
      if (this.flashcardStack.length > 0) {
        this.currentCard = this.flashcardStack[0];
        this.swipeState = 'center';
      } else {
        this.completeFlashcardSession();
      }
    }, 300);
  }

  completeFlashcardSession(): void {
    this.totalQuestionsCompleted += this.knownCards + this.unknownCards;
    this.checkAchievements();
    this.saveUserProgress();
    
    // Show completion screen
    setTimeout(() => {
      alert(`Session Complete!\n✅ Known: ${this.knownCards}\n❌ To Review: ${this.unknownCards}\n🎯 XP Gained: ${(this.knownCards * 10) + (this.unknownCards * 5)}`);
      this.currentMode = 'menu';
    }, 500);
  }

  // ==================== BATTLE ARENA MODE ====================
  
  startBattleMode(): void {
    this.currentMode = 'battle';
    this.battleStats = {
      score: 0,
      streak: 0,
      lives: 3,
      timeLeft: 60,
      combo: 1
    };
    this.battleActive = true;
    this.loadBattleQuestion();
    this.startBattleTimer();
  }

  loadBattleQuestion(): void {
    const randomQuestions = this.shuffleArray([...this.currentQuestions]);
    this.battleQuestion = randomQuestions[0];
    
    // Generate multiple choice options
    this.battleOptions = this.generateBattleOptions(this.battleQuestion);
  }

  generateBattleOptions(question: InterviewQuestion): string[] {
    const options: string[] = [];
    
    // Correct answer (simplified)
    const correctAnswer = question.answer.substring(0, 100) + '...';
    options.push(correctAnswer);
    
    // Generate 3 wrong answers
    const wrongAnswers = [
      'This uses a completely different approach with async/await patterns',
      'It implements a callback-based solution with promise chaining',
      'The solution involves using a third-party library for optimization'
    ];
    
    options.push(...wrongAnswers.slice(0, 3));
    
    return this.shuffleArray(options);
  }

  answerBattle(selectedOption: string): void {
    if (!this.battleQuestion) return;
    
    const isCorrect = selectedOption.includes(this.battleQuestion.answer.substring(0, 50));
    
    if (isCorrect) {
      const points = 100 * this.battleStats.combo;
      this.battleStats.score += points;
      this.battleStats.streak++;
      this.battleStats.combo = Math.min(this.battleStats.combo + 0.5, 5);
      this.addXP(20);
      
      this.showBattleFeedback('✅ Correct! +' + points, 'success');
    } else {
      this.battleStats.lives--;
      this.battleStats.streak = 0;
      this.battleStats.combo = 1;
      this.showBattleFeedback('❌ Wrong! -1 Life', 'error');
      
      if (this.battleStats.lives <= 0) {
        this.endBattle();
        return;
      }
    }
    
    setTimeout(() => this.loadBattleQuestion(), 1500);
  }

  startBattleTimer(): void {
    this.battleTimer = setInterval(() => {
      this.battleStats.timeLeft--;
      
      if (this.battleStats.timeLeft <= 0) {
        this.endBattle();
      }
    }, 1000);
  }

  endBattle(): void {
    this.battleActive = false;
    if (this.battleTimer) {
      clearInterval(this.battleTimer);
    }
    
    const finalScore = this.battleStats.score;
    this.checkBattleAchievements(finalScore);
    this.saveUserProgress();
    
    setTimeout(() => {
      alert(`Battle Complete!\n🎯 Final Score: ${finalScore}\n⚡ Best Streak: ${this.battleStats.streak}\n🏆 Rank: ${this.getBattleRank(finalScore)}`);
      this.currentMode = 'menu';
    }, 500);
  }

  getBattleRank(score: number): string {
    if (score >= 2000) return 'Legendary 👑';
    if (score >= 1500) return 'Master ⚔️';
    if (score >= 1000) return 'Expert 🎯';
    if (score >= 500) return 'Advanced 📚';
    return 'Beginner 🌱';
  }

  showBattleFeedback(message: string, type: 'success' | 'error'): void {
    // Visual feedback implementation
    console.log(message);
  }

  // ==================== MEMORY PALACE MODE ====================
  
  startMemoryPalace(): void {
    this.currentMode = 'memory-palace';
    this.currentRoom = 0;
    this.initializeMemoryRooms();
  }

  initializeMemoryRooms(): void {
    const categories = [...new Set(this.allQuestions.map(q => q.category))].slice(0, 5);
    
    this.memoryRooms = categories.map((category, index) => ({
      name: category,
      icon: this.getCategoryIcon(category),
      questions: this.allQuestions.filter(q => q.category === category).slice(0, 3),
      visited: false
    }));
  }

  getCategoryIcon(category: string): string {
    const icons: {[key: string]: string} = {
      'Angular': '🅰️',
      'React': '⚛️',
      'JavaScript': '📜',
      'TypeScript': '📘',
      'Node.js': '🟢',
      'Database': '🗄️',
      'System Design': '🏗️'
    };
    return icons[category] || '📚';
  }

  enterRoom(roomIndex: number): void {
    this.currentRoom = roomIndex;
    this.memoryRooms[roomIndex].visited = true;
    
    // Generate visual story for memory
    const room = this.memoryRooms[roomIndex];
    this.visualStory = this.generateVisualStory(room);
  }

  generateVisualStory(room: any): string {
    const stories = [
      `🚪 You enter the ${room.name} Chamber. The walls glow with ancient code symbols...`,
      `🏛️ A grand library of ${room.name} knowledge appears before you...`,
      `🌟 You discover a mystical ${room.name} sanctuary with ${room.questions.length} sacred scrolls...`
    ];
    return stories[Math.floor(Math.random() * stories.length)];
  }

  completeMemoryRoom(): void {
    this.addXP(50);
    
    if (this.currentRoom < this.memoryRooms.length - 1) {
      this.currentRoom++;
    } else {
      // Completed all rooms
      alert('🏆 Memory Palace Complete! You have mastered all chambers!');
      this.unlockAchievement('memory-champion');
      this.currentMode = 'menu';
    }
  }

  // ==================== DAILY CHALLENGE ====================
  
  initializeDailyChallenge(): void {
    const today = new Date().toDateString();
    const saved = localStorage.getItem('dailyChallenge');
    
    if (saved) {
      const challenge = JSON.parse(saved);
      if (challenge.date === today) {
        this.dailyChallenge = challenge;
        return;
      }
    }
    
    // Generate new daily challenge
    this.dailyChallenge = {
      date: today,
      questions: this.shuffleArray([...this.allQuestions]).slice(0, 5),
      completed: false,
      streak: this.calculateStreak()
    };
    
    localStorage.setItem('dailyChallenge', JSON.stringify(this.dailyChallenge));
  }

  startDailyChallenge(): void {
    this.currentMode = 'daily-challenge';
    this.currentQuestionIndex = 0;
  }

  completeDailyChallenge(): void {
    if (this.dailyChallenge) {
      this.dailyChallenge.completed = true;
      this.dailyChallenge.streak++;
      localStorage.setItem('dailyChallenge', JSON.stringify(this.dailyChallenge));
      
      this.addXP(100);
      this.unlockAchievement('streak-king');
      
      alert(`🎉 Daily Challenge Complete!\n🔥 Streak: ${this.dailyChallenge.streak} days\n⭐ Bonus XP: 100`);
      this.currentMode = 'menu';
    }
  }

  nextDailyQuestion(): void {
    this.currentQuestionIndex++;
  }

  calculateStreak(): number {
    const saved = localStorage.getItem('dailyChallenge');
    if (saved) {
      const challenge = JSON.parse(saved);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (challenge.date === yesterday.toDateString() && challenge.completed) {
        return challenge.streak || 0;
      }
    }
    return 0;
  }

  // ==================== PROGRESSION SYSTEM ====================
  
  addXP(amount: number): void {
    this.userXP += amount;
    
    while (this.userXP >= this.userXPToNext) {
      this.userXP -= this.userXPToNext;
      this.userLevel++;
      this.userXPToNext = Math.floor(this.userXPToNext * 1.5);
      
      alert(`🎊 LEVEL UP! You are now level ${this.userLevel}!`);
    }
    
    this.saveUserProgress();
  }

  getXPPercentage(): number {
    return (this.userXP / this.userXPToNext) * 100;
  }

  unlockAchievement(achievementId: string): void {
    const achievement = this.achievements.find(a => a.id === achievementId);
    if (achievement && !achievement.unlocked) {
      achievement.unlocked = true;
      alert(`🏆 Achievement Unlocked!\n${achievement.icon} ${achievement.name}\n${achievement.description}`);
      this.saveUserProgress();
    }
  }

  checkAchievements(): void {
    // Check first win
    if (this.totalQuestionsCompleted >= 1) {
      this.unlockAchievement('first-win');
    }
    
    // Check knowledge seeker
    if (this.totalQuestionsCompleted >= 50) {
      this.unlockAchievement('knowledge-seeker');
    }
    
    // Update achievement progress
    this.achievements.forEach(achievement => {
      if (!achievement.unlocked) {
        achievement.progress = Math.min(this.totalQuestionsCompleted, achievement.maxProgress);
      }
    });
    
    this.saveUserProgress();
  }

  checkBattleAchievements(score: number): void {
    const battleWins = this.achievements.find(a => a.id === 'battle-master');
    if (battleWins && score >= 1000) {
      battleWins.progress++;
      if (battleWins.progress >= battleWins.maxProgress) {
        this.unlockAchievement('battle-master');
      }
    }
  }

  // ==================== UTILITY FUNCTIONS ====================
  
  shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  backToMenu(): void {
    if (this.battleActive) {
      this.endBattle();
    }
    this.currentMode = 'menu';
  }

  get unlockedAchievements(): Achievement[] {
    return this.achievements.filter(a => a.unlocked);
  }

  get lockedAchievements(): Achievement[] {
    return this.achievements.filter(a => !a.unlocked);
  }
}
