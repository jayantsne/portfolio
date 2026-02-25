import { Component, OnInit, OnDestroy } from '@angular/core';
import { trigger, transition, style, animate, state } from '@angular/animations';

export interface MemoryBlock {
  id: number;
  type: 'variable' | 'object' | 'function' | 'code';
  name: string;
  value: string;
  memoryType: 'stack' | 'heap' | 'static' | 'code' | null;
  size: string;
  lifetime: string;
  animated: boolean;
}

export interface MemorySection {
  type: 'stack' | 'heap' | 'static' | 'code';
  nameHindi: string;
  nameEnglish: string;
  icon: string;
  color: string;
  description: string;
  characteristics: string[];
  items: MemoryBlock[];
}

@Component({
  selector: 'app-memory-game',
  templateUrl: './memory-game.component.html',
  styleUrls: ['./memory-game.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.5s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-30px)' }),
        animate('0.4s ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('memoryAnimation', [
      state('normal', style({ transform: 'scale(1)', boxShadow: '0 4px 8px rgba(0,0,0,0.2)' })),
      state('highlight', style({ transform: 'scale(1.1)', boxShadow: '0 8px 16px rgba(255,215,0,0.6)' })),
      transition('normal => highlight', animate('0.3s ease-out')),
      transition('highlight => normal', animate('0.3s ease-out'))
    ]),
    trigger('allocate', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.5) translateY(-50px)' }),
        animate('0.6s cubic-bezier(0.34, 1.56, 0.64, 1)', 
          style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
      ])
    ]),
    trigger('deallocate', [
      transition(':leave', [
        animate('0.5s ease-in', 
          style({ opacity: 0, transform: 'scale(0.5) translateY(50px)' }))
      ])
    ])
  ]
})
export class MemoryGameComponent implements OnInit, OnDestroy {
  currentView: 'menu' | 'quiz' = 'menu';
  selectedMemoryType: MemorySection | null = null;
  score: number = 0;
  totalQuestions: number = 0;
  currentQuestionIndex: number = 0;
  
  // Memory sections
  memorySections: MemorySection[] = [
    {
      type: 'stack',
      nameHindi: '',
      nameEnglish: 'Stack Memory',
      icon: '📚',
      color: '#4CAF50',
      description: 'Fast and automatic memory. Stores local variables and function calls.',
      characteristics: [
        '⚡ **Very Fast**: Stack pointer just moves up and down',
        '📏 **Limited Size**: Usually 1-8 MB (Avoid Stack Overflow!)',
        '🔄 **LIFO**: Last In, First Out',
        '⏱️ **Automatic**: Memory freed when function ends',
        '🎯 **Local Scope**: Only available in the function where created',
        '💾 **Stores**: Primitive types (int, float, bool), local variables, function parameters, return addresses'
      ],
      items: []
    },
    {
      type: 'heap',
      nameHindi: '',
      nameEnglish: 'Heap Memory',
      icon: '🗂️',
      color: '#2196F3',
      description: 'Large and flexible memory. Stores objects, arrays and dynamic allocations.',
      characteristics: [
        '🐌 **Slower**: Allocation/deallocation takes time',
        '📦 **Large Size**: Can be GBs (depends on RAM)',
        '🎲 **Random Access**: Can allocate/deallocate anywhere',
        '👨‍💻 **Manual**: Developer must manage explicitly',
        '🌍 **Global Access**: Accessible throughout program (via references)',
        '💾 **Stores**: Objects, Arrays, Dynamic allocations (new/malloc), Strings, Complex data structures'
      ],
      items: []
    },
    {
      type: 'static',
      nameHindi: '',
      nameEnglish: 'Static/Global Memory',
      icon: '🌐',
      color: '#FF9800',
      description: 'Exists for the entire program lifetime. Global variables live here.',
      characteristics: [
        '⏳ **Full Lifetime**: Lives from program start to end',
        '🌍 **Globally Available**: Accessible throughout program',
        '🎯 **Fixed Size**: Determined at compile time',
        '🔒 **Safe**: No memory leaks',
        '⚙️ **Compile-time Allocation**: Allocated when program loads',
        '💾 **Stores**: Global variables, Static variables, String literals, Constants'
      ],
      items: []
    },
    {
      type: 'code',
      nameHindi: '',
      nameEnglish: 'Code/Text Segment',
      icon: '💻',
      color: '#9C27B0',
      description: 'Stores your actual program code. This is read-only.',
      characteristics: [
        '📖 **Read-only**: Cannot be modified (for security)',
        '💿 **Executable**: CPU executes it directly',
        '🔐 **Protected**: Protected by OS',
        '📏 **Fixed Size**: Determined at compile time',
        '🔄 **Shared**: Multiple processes can share',
        '💾 **Stores**: Program instructions, Function code, Compiled binary, Machine code'
      ],
      items: []
    }
  ];

  // Quiz questions
  quizItems: MemoryBlock[] = [
    {
      id: 1,
      type: 'variable',
      name: 'int age = 25',
      value: '25',
      memoryType: null,
      size: '4 bytes',
      lifetime: 'Function scope',
      animated: false
    },
    {
      id: 2,
      type: 'object',
      name: 'new User()',
      value: 'User object',
      memoryType: null,
      size: 'Variable',
      lifetime: 'Until deleted',
      animated: false
    },
    {
      id: 3,
      type: 'variable',
      name: 'static count = 0',
      value: '0',
      memoryType: null,
      size: '4 bytes',
      lifetime: 'Program lifetime',
      animated: false
    },
    {
      id: 4,
      type: 'function',
      name: 'function add()',
      value: 'Function code',
      memoryType: null,
      size: 'Fixed',
      lifetime: 'Program lifetime',
      animated: false
    },
    {
      id: 5,
      type: 'object',
      name: 'int[] arr = new int[100]',
      value: 'Array',
      memoryType: null,
      size: '400 bytes',
      lifetime: 'Until deleted',
      animated: false
    },
    {
      id: 6,
      type: 'variable',
      name: 'float price = 99.99',
      value: '99.99',
      memoryType: null,
      size: '4 bytes',
      lifetime: 'Function scope',
      animated: false
    },
    {
      id: 7,
      type: 'variable',
      name: 'global API_KEY',
      value: 'String',
      memoryType: null,
      size: 'Variable',
      lifetime: 'Program lifetime',
      animated: false
    },
    {
      id: 8,
      type: 'object',
      name: 'malloc(1024)',
      value: 'Raw memory',
      memoryType: null,
      size: '1024 bytes',
      lifetime: 'Until freed',
      animated: false
    }
  ];

  currentQuizItem: MemoryBlock | null = null;
  feedbackMessage: string = '';
  showFeedback: boolean = false;
  isCorrect: boolean = false;

  // Drag and drop state
  isDragging: boolean = false;
  dragOverZone: string | null = null;
  correctZone: string | null = null;
  incorrectZone: string | null = null;
  blockPlaced: boolean = false;
  placedInZone: string | null = null;
  
  // Touch drag state
  touchStartX: number = 0;
  touchStartY: number = 0;
  draggedElement: HTMLElement | null = null;
  clonedElement: HTMLElement | null = null;
  rafId: number | null = null;
  lastZoneCheck: number = 0;
  currentTouchX: number = 0;
  currentTouchY: number = 0;

  ngOnInit(): void {
    // Initialize - game-only mode
  }

  ngOnDestroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }

  startQuiz(): void {
    this.currentView = 'quiz';
    this.score = 0;
    this.currentQuestionIndex = 0;
    this.totalQuestions = this.quizItems.length;
    this.shuffleQuizItems();
    this.loadNextQuestion();
  }

  shuffleQuizItems(): void {
    for (let i = this.quizItems.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.quizItems[i], this.quizItems[j]] = [this.quizItems[j], this.quizItems[i]];
    }
  }

  loadNextQuestion(): void {
    if (this.currentQuestionIndex < this.quizItems.length) {
      this.currentQuizItem = { ...this.quizItems[this.currentQuestionIndex] };
      this.currentQuizItem.memoryType = null;
      this.showFeedback = false;
      this.feedbackMessage = '';
      
      // Reset drag states
      this.isDragging = false;
      this.dragOverZone = null;
      this.correctZone = null;
      this.incorrectZone = null;
      this.blockPlaced = false;
      this.placedInZone = null;
      this.lastZoneCheck = 0;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    } else {
      this.showQuizResults();
    }
  }

  checkAnswer(selectedType: 'stack' | 'heap' | 'static' | 'code'): void {
    if (!this.currentQuizItem) return;

    const correctAnswers: { [key: number]: 'stack' | 'heap' | 'static' | 'code' } = {
      1: 'stack',    // int age = 25 (local variable)
      2: 'heap',     // new User() (object allocation)
      3: 'static',   // static count (static variable)
      4: 'code',     // function add() (function code)
      5: 'heap',     // int[] arr = new int[100] (array allocation)
      6: 'stack',    // float price (local variable)
      7: 'static',   // global API_KEY (global variable)
      8: 'heap'      // malloc(1024) (dynamic allocation)
    };

    const correctAnswer = correctAnswers[this.currentQuizItem.id];
    this.isCorrect = selectedType === correctAnswer;

    if (this.isCorrect) {
      this.score++;
      this.feedbackMessage = this.getCorrectFeedback(correctAnswer);
    } else {
      this.feedbackMessage = this.getIncorrectFeedback(correctAnswer, selectedType);
    }

    this.currentQuizItem.memoryType = selectedType;
    this.currentQuizItem.animated = true;
    this.showFeedback = true;

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(this.isCorrect ? [50, 50, 50] : [100]);
    }

    setTimeout(() => {
      this.currentQuestionIndex++;
      this.loadNextQuestion();
    }, 3000);
  }

  // Drag and Drop Handlers
  onDragStart(event: DragEvent): void {
    this.isDragging = true;
    if (event.dataTransfer && this.currentQuizItem) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', this.currentQuizItem.id.toString());
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    const zone = (event.currentTarget as HTMLElement).getAttribute('data-type');
    this.dragOverZone = zone;
  }

  onDragLeave(event: DragEvent): void {
    this.dragOverZone = null;
  }

  onDrop(event: DragEvent, zoneType: 'stack' | 'heap' | 'static' | 'code'): void {
    event.preventDefault();
    this.isDragging = false;
    this.dragOverZone = null;
    this.blockPlaced = true;
    this.placedInZone = zoneType;
    
    // Check answer after a short delay to show placement
    setTimeout(() => {
      this.checkAnswer(zoneType);
      this.visualizePlacement(zoneType);
    }, 300);
  }

  // Touch Handlers for Mobile - Optimized
  onTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.isDragging = true;
    
    this.draggedElement = event.currentTarget as HTMLElement;
    this.draggedElement.classList.add('dragging');
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isDragging || !this.draggedElement) return;
    
    event.preventDefault();
    const touch = event.touches[0];
    this.currentTouchX = touch.clientX;
    this.currentTouchY = touch.clientY;
    
    // Use requestAnimationFrame for smooth movement
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => this.updateDragPosition());
    }
    
    // Throttle zone checking to every 150ms
    const now = Date.now();
    if (now - this.lastZoneCheck > 150) {
      this.checkDropZone(this.currentTouchX, this.currentTouchY);
      this.lastZoneCheck = now;
    }
  }

  private updateDragPosition(): void {
    if (this.draggedElement && this.isDragging) {
      const deltaX = this.currentTouchX - this.touchStartX;
      const deltaY = this.currentTouchY - this.touchStartY;
      this.draggedElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    }
    this.rafId = null;
  }

  private checkDropZone(x: number, y: number): void {
    const elementBelow = document.elementFromPoint(x, y);
    if (elementBelow) {
      const zone = elementBelow.closest('.memory-zone');
      const newZoneType = zone ? zone.getAttribute('data-type') : null;
      if (newZoneType !== this.dragOverZone) {
        this.dragOverZone = newZoneType;
      }
    }
  }

  onTouchEnd(event: TouchEvent): void {
    if (!this.isDragging || !this.draggedElement) return;
    
    // Cancel any pending animation frame
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    const touch = event.changedTouches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // Reset dragged element
    this.draggedElement.style.transform = '';
    this.draggedElement.classList.remove('dragging');
    
    if (elementBelow) {
      const zone = elementBelow.closest('.memory-zone');
      if (zone) {
        const zoneType = zone.getAttribute('data-type') as 'stack' | 'heap' | 'static' | 'code';
        this.blockPlaced = true;
        this.placedInZone = zoneType;
        
        setTimeout(() => {
          this.checkAnswer(zoneType);
          this.visualizePlacement(zoneType);
        }, 200);
      }
    }
    
    this.isDragging = false;
    this.dragOverZone = null;
    this.draggedElement = null;
  }

  visualizePlacement(zoneType: string): void {
    if (this.isCorrect) {
      this.correctZone = zoneType;
      setTimeout(() => {
        this.correctZone = null;
      }, 2000);
    } else {
      this.incorrectZone = zoneType;
      setTimeout(() => {
        this.incorrectZone = null;
      }, 2000);
    }
  }

  getCorrectFeedback(type: 'stack' | 'heap' | 'static' | 'code'): string {
    const messages: { [key: string]: string } = {
      stack: '✅ Correct! This local variable is stored in Stack Memory. Fast and automatic!',
      heap: '✅ Great job! This is allocated in Heap Memory. Remember, it needs to be manually freed.',
      static: '✅ Perfect! This lives in Static/Global Memory. Accessible throughout the program!',
      code: '✅ Exactly right! This is stored in Code Segment. Read-only and executable!'
    };
    return messages[type];
  }

  getIncorrectFeedback(correct: string, selected: string): string {
    const typeNames: { [key: string]: string } = {
      stack: 'Stack',
      heap: 'Heap',
      static: 'Static/Global',
      code: 'Code Segment'
    };
    return `❌ Incorrect! Correct answer: ${typeNames[correct]} Memory. You selected: ${typeNames[selected]}`;
  }

  showQuizResults(): void {
    const percentage = (this.score / this.totalQuestions) * 100;
    if (percentage >= 80) {
      this.feedbackMessage = `🎉 Excellent! You got ${this.score}/${this.totalQuestions} correct! (${percentage.toFixed(0)}%)`;
    } else if (percentage >= 60) {
      this.feedbackMessage = `👍 Good job! You got ${this.score}/${this.totalQuestions} correct. (${percentage.toFixed(0)}%) Keep learning!`;
    } else {
      this.feedbackMessage = `📚 ${this.score}/${this.totalQuestions} correct. (${percentage.toFixed(0)}%) Try again!`;
    }
    this.showFeedback = true;
  }

  animateMemoryAllocation(section: MemorySection): void {
    // Simulate memory allocation with animation
    const examples: { [key: string]: MemoryBlock[] } = {
      stack: [
        { id: 101, type: 'variable', name: 'int x = 10', value: '10', memoryType: 'stack', size: '4 bytes', lifetime: 'Function ends', animated: true },
        { id: 102, type: 'variable', name: 'char c = \'A\'', value: 'A', memoryType: 'stack', size: '1 byte', lifetime: 'Function ends', animated: true },
        { id: 103, type: 'variable', name: 'bool flag = true', value: 'true', memoryType: 'stack', size: '1 byte', lifetime: 'Function ends', animated: true }
      ],
      heap: [
        { id: 201, type: 'object', name: 'new Person()', value: 'Object', memoryType: 'heap', size: 'Variable', lifetime: 'Until delete', animated: true },
        { id: 202, type: 'object', name: 'new int[50]', value: 'Array', memoryType: 'heap', size: '200 bytes', lifetime: 'Until delete', animated: true },
        { id: 203, type: 'object', name: 'malloc(100)', value: 'Buffer', memoryType: 'heap', size: '100 bytes', lifetime: 'Until free', animated: true }
      ],
      static: [
        { id: 301, type: 'variable', name: 'static counter', value: '0', memoryType: 'static', size: '4 bytes', lifetime: 'Program', animated: true },
        { id: 302, type: 'variable', name: 'global config', value: 'Config', memoryType: 'static', size: 'Variable', lifetime: 'Program', animated: true },
        { id: 303, type: 'variable', name: 'const PI = 3.14', value: '3.14', memoryType: 'static', size: '4 bytes', lifetime: 'Program', animated: true }
      ],
      code: [
        { id: 401, type: 'function', name: 'main()', value: 'Function', memoryType: 'code', size: 'Fixed', lifetime: 'Program', animated: true },
        { id: 402, type: 'function', name: 'calculate()', value: 'Function', memoryType: 'code', size: 'Fixed', lifetime: 'Program', animated: true },
        { id: 403, type: 'function', name: 'class User', value: 'Class code', memoryType: 'code', size: 'Fixed', lifetime: 'Program', animated: true }
      ]
    };

    section.items = examples[section.type] || [];
  }

  backToMenu(): void {
    this.currentView = 'menu';
    this.selectedMemoryType = null;
  }

  restartQuiz(): void {
    this.startQuiz();
  }

  getMemoryTypeColor(type: string): string {
    const section = this.memorySections.find(s => s.type === type);
    return section ? section.color : '#666';
  }

  getMemoryTypeIcon(type: string): string {
    const section = this.memorySections.find(s => s.type === type);
    return section ? section.icon : '❓';
  }
}
