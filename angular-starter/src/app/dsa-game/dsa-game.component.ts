import { Component, OnInit, OnDestroy } from '@angular/core';
import { trigger, transition, style, animate, state, keyframes } from '@angular/animations';
import { SoundEffectsService } from './sound-effects.service';

export interface Block {
  id: number;
  value: number;
  color: string;
  position: number;
  state: 'normal' | 'correct' | 'incorrect' | 'highlight' | 'compare' | 'suggested' | 'target';
}

export interface ExpectedMove {
  sourceIndex: number;
  targetIndex: number;
  description: string;
  reason: string;
}

export interface GameLevel {
  id: number;
  name: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  icon: string;
  algorithm: string;
  locked: boolean;
  requiredStars: number;
  bestScore: number;
  completed: boolean;
  tutorial?: {
    whatIsIt: string;
    howItWorks: string;
    complexity: {
      time: string;
      space: string;
      timeExplanation: string;
      spaceExplanation: string;
    };
    whenToUse: string[];
    advantages: string[];
    disadvantages: string[];
    realWorldExample: string;
    interviewTips: string[];
    codeExample?: string;
  };
}

export interface AlgorithmStep {
  title: string;
  description: string;
  example: string;
}

@Component({
  selector: 'app-dsa-game',
  templateUrl: './dsa-game.component.html',
  styleUrls: ['./dsa-game.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.4s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-30px)' }),
        animate('0.3s 0.1s ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('blockAnimation', [
      state('normal', style({ transform: 'scale(1)', filter: 'brightness(1)' })),
      state('correct', style({ transform: 'scale(1.15)', filter: 'brightness(1.3) drop-shadow(0 0 10px #4CAF50)' })),
      state('incorrect', style({ transform: 'scale(0.9)', filter: 'brightness(0.7)' })),
      state('highlight', style({ transform: 'scale(1.1)', filter: 'brightness(1.2) drop-shadow(0 0 8px #FFD700)' })),
      state('compare', style({ transform: 'translateY(-10px)', filter: 'brightness(1.1)' })),
      transition('* => correct', [
        animate('0.3s ease-out', keyframes([
          style({ transform: 'scale(1.3) rotate(5deg)', offset: 0.5 }),
          style({ transform: 'scale(1.15) rotate(0deg)', offset: 1 })
        ]))
      ]),
      transition('* => incorrect', [
        animate('0.4s ease-out', keyframes([
          style({ transform: 'translateX(-10px)', offset: 0.25 }),
          style({ transform: 'translateX(10px)', offset: 0.5 }),
          style({ transform: 'translateX(-5px)', offset: 0.75 }),
          style({ transform: 'scale(0.9)', offset: 1 })
        ]))
      ]),
      transition('* => normal', animate('0.3s ease-out')),
      transition('* => highlight', animate('0.2s ease-out')),
      transition('* => compare', animate('0.2s ease-out'))
    ]),
    trigger('modalSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(100%)' }),
        animate('0.4s cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('0.3s ease-in', style({ opacity: 0, transform: 'translateY(100%)' }))
      ])
    ]),
    trigger('starPop', [
      transition(':enter', [
        style({ transform: 'scale(0) rotate(0deg)', opacity: 0 }),
        animate('0.6s cubic-bezier(0.34, 1.56, 0.64, 1)', style({ transform: 'scale(1) rotate(360deg)', opacity: 1 }))
      ])
    ]),
    trigger('confetti', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-100px)' }),
        animate('1s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class DsaGameComponent implements OnInit, OnDestroy {
  // Game state
  currentView: 'menu' | 'game' | 'tutorial' | 'leaderboard' = 'menu';
  selectedLevel: GameLevel | null = null;
  currentSubLevel: number = 1; // 1 = Easy, 2 = Medium, 3 = Hard
  
  // Blocks for sorting game
  blocks: Block[] = [];
  draggedBlock: Block | null = null;
  
  // Game stats
  moves: number = 0;
  correctMoves: number = 0;
  incorrectMoves: number = 0;
  score: number = 0;
  timeElapsed: number = 0;
  timer: any = null;
  stars: number = 0;
  totalStars: number = 0;
  
  // Algorithm learning
  currentAlgorithmStep: AlgorithmStep | null = null;
  algorithmSteps: AlgorithmStep[] = [];
  currentStepIndex: number = 0;
  showAlgorithmGuide: boolean = true;
  lastMoveCorrect: boolean | null = null;
  moveAffirmation: string = '';
  
  // Step-by-step algorithm tracking
  expectedMove: ExpectedMove | null = null;
  currentPass: number = 0;
  currentCompareIndex: number = 0;
  sortedUntilIndex: number = -1; // For selection sort
  guidedMode: boolean = true; // Enable/disable step guidance
  
  // Sound effects
  soundEnabled: boolean = true;
  
  // Code visualization
  showCodeVisualization: boolean = false;
  currentCodeLine: number = -1;
  algorithmCode: string[] = [];
  
  // Settings panel
  showSettings: boolean = false;
  customBlockCount: number = 0;
  autoAdaptBlockCount: boolean = true;
  blockCountOptions: number[] = [];
  
  // Make Math available in template
  Math = Math;
  
  // Complexity meter
  showComplexityMeter: boolean = true;
  currentComplexity: { comparisons: number; swaps: number; arrayAccesses: number } = {
    comparisons: 0,
    swaps: 0,
    arrayAccesses: 0
  };

  // Resize handler for proper cleanup
  private resizeHandler: () => void;
  private resizeTimeout: any = null;

  // Complexity Quiz Game
  complexityQuizMode: boolean = false;
  currentComplexityQuestion: number = 0;
  complexityQuizScore: number = 0;
  complexityQuizTotal: number = 0;
  showComplexityFeedback: boolean = false;
  complexityFeedbackMessage: string = '';
  isComplexityCorrect: boolean = false;
  dragOverComplexityZone: string | null = null;
  complexityBlockPlaced: boolean = false;
  placedInComplexityZone: string | null = null;
  correctComplexityZone: string | null = null;
  incorrectComplexityZone: string | null = null;

  // Touch drag state for complexity quiz
  complexityTouchStartX: number = 0;
  complexityTouchStartY: number = 0;
  complexityDraggedElement: HTMLElement | null = null;
  complexityRafId: number | null = null;
  complexityLastZoneCheck: number = 0;
  complexityCurrentTouchX: number = 0;
  complexityCurrentTouchY: number = 0;

  complexityQuestions = [
    {
      id: 1,
      code: `function example(arr) {
  return arr[0];
}`,
      description: 'Access first element of array',
      correctComplexity: 'O(1)',
      explanation: 'Accessing an element by index is constant time - it doesn\'t matter if the array has 10 or 10 million elements!',
      category: 'Array Access'
    },
    {
      id: 2,
      code: `function example(arr) {
  for (let i = 0; i < arr.length; i++) {
    console.log(arr[i]);
  }
}`,
      description: 'Loop through array once',
      correctComplexity: 'O(n)',
      explanation: 'Single loop that visits each element once = O(n). If array size doubles, time doubles!',
      category: 'Single Loop'
    },
    {
      id: 3,
      code: `function example(arr) {
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length; j++) {
      console.log(arr[i] + arr[j]);
    }
  }
}`,
      description: 'Nested loops - each element pairs with every other',
      correctComplexity: 'O(n²)',
      explanation: 'Nested loops multiply! Outer loop runs n times, inner loop runs n times for each outer iteration = n × n = O(n²)',
      category: 'Nested Loops'
    },
    {
      id: 4,
      code: `function binarySearch(arr, target) {
  let left = 0, right = arr.length - 1;
  while (left <= right) {
    let mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
}`,
      description: 'Binary search - divide and conquer',
      correctComplexity: 'O(log n)',
      explanation: 'Binary search halves the search space each step! 1000 items → 500 → 250 → 125... Only ~10 steps needed!',
      category: 'Divide & Conquer'
    },
    {
      id: 5,
      code: `function example(arr) {
  arr.sort(); // Built-in sort
  return arr;
}`,
      description: 'Efficient sorting algorithm',
      correctComplexity: 'O(n log n)',
      explanation: 'Modern sorting algorithms like Merge Sort and Quick Sort have O(n log n) complexity - best possible for comparison sorts!',
      category: 'Sorting'
    },
    {
      id: 6,
      code: `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n-1) + fibonacci(n-2);
}`,
      description: 'Recursive Fibonacci without memoization',
      correctComplexity: 'O(2ⁿ)',
      explanation: 'Each call spawns 2 more calls, creating an exponential explosion! fibonacci(50) would take years to compute!',
      category: 'Recursion'
    },
    {
      id: 7,
      code: `function example(arr) {
  for (let i = 0; i < arr.length; i++) {
    console.log(arr[i]);
  }
  for (let j = 0; j < arr.length; j++) {
    console.log(arr[j]);
  }
}`,
      description: 'Two separate loops (sequential)',
      correctComplexity: 'O(n)',
      explanation: 'Sequential operations add: O(n) + O(n) = O(2n) = O(n). We drop constants in Big O!',
      category: 'Multiple Operations'
    },
    {
      id: 8,
      code: `function example(arr) {
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] > arr[j]) {
        swap(arr, i, j);
      }
    }
  }
}`,
      description: 'Bubble Sort pattern',
      correctComplexity: 'O(n²)',
      explanation: 'Even though inner loop starts at i+1, it\'s still nested loops! Roughly (n × n)/2 operations = O(n²)',
      category: 'Sorting'
    },
    {
      id: 9,
      code: `function example(arr, k) {
  return arr[k];
}`,
      description: 'Access element at specific index',
      correctComplexity: 'O(1)',
      explanation: 'Array index access is always constant time! Direct memory address calculation.',
      category: 'Array Access'
    },
    {
      id: 10,
      code: `function example(arr) {
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < 10; j++) {
      console.log(i, j);
    }
  }
}`,
      description: 'Outer loop depends on n, inner loop is constant',
      correctComplexity: 'O(n)',
      explanation: 'Outer loop = O(n), inner loop = O(10) = O(1). Result: O(n × 1) = O(n). Constants don\'t affect Big O!',
      category: 'Loop Analysis'
    },
    {
      id: 11,
      code: `function example(n) {
  let count = 0;
  for (let i = n; i > 1; i = Math.floor(i / 2)) {
    count++;
  }
  return count;
}`,
      description: 'Dividing by 2 each iteration',
      correctComplexity: 'O(log n)',
      explanation: 'Halving each step = logarithmic! Similar to binary search. 1000 → 500 → 250 → 125 → ... (~10 steps)',
      category: 'Logarithmic'
    },
    {
      id: 12,
      code: `function example(arr) {
  const set = new Set();
  for (let i = 0; i < arr.length; i++) {
    set.add(arr[i]);
  }
  return set.size;
}`,
      description: 'Creating a hash set from array',
      correctComplexity: 'O(n)',
      explanation: 'Loop runs n times, each set.add() is O(1) average. Total: O(n × 1) = O(n). Space is also O(n)!',
      category: 'Data Structures'
    }
  ];

  complexityZones = [
    { type: 'O(1)', name: 'Constant', icon: '⚡', color: '#4CAF50', description: 'Same time regardless of input size' },
    { type: 'O(log n)', name: 'Logarithmic', icon: '📈', color: '#2196F3', description: 'Halves problem each step' },
    { type: 'O(n)', name: 'Linear', icon: '📏', color: '#FF9800', description: 'Proportional to input size' },
    { type: 'O(n log n)', name: 'Linearithmic', icon: '🔄', color: '#9C27B0', description: 'Efficient sorting' },
    { type: 'O(n²)', name: 'Quadratic', icon: '🔲', color: '#F44336', description: 'Nested loops' },
    { type: 'O(2ⁿ)', name: 'Exponential', icon: '💥', color: '#E91E63', description: 'Branches exponentially' }
  ];
  
  // Game levels with progression
  levels: GameLevel[] = [
    {
      id: 1,
      name: 'Bubble Sort - The Basics',
      description: '🎓 START HERE! Compare neighbors and swap if wrong order. Like bubbles rising to the top!',
      difficulty: 'Easy',
      icon: '🫧',
      algorithm: 'bubble',
      locked: false,
      requiredStars: 0,
      bestScore: 0,
      completed: false,
      tutorial: {
        whatIsIt: '🫧 Bubble Sort is the simplest sorting algorithm! It works by repeatedly comparing adjacent elements and swapping them if they\'re in the wrong order. The largest element "bubbles up" to the end in each pass, just like bubbles rise to the surface of water!',
        howItWorks: `Step-by-step process:
        
1️⃣ Start at the beginning of the array
2️⃣ Compare the first two elements
3️⃣ If the first is greater than the second, swap them
4️⃣ Move to the next pair and repeat
5️⃣ After one complete pass, the largest element is at the end
6️⃣ Repeat the process for the remaining elements
7️⃣ Continue until no more swaps are needed

Think of it like this: Imagine you have a line of people arranged by height. You walk down the line, and whenever you find someone taller standing before someone shorter, you ask them to swap positions. After one walk-through, the tallest person will be at the end. Do this repeatedly, and eventually everyone is sorted!`,
        complexity: {
          time: 'O(n²)',
          space: 'O(1)',
          timeExplanation: 'Worst & Average Case: O(n²) - We need up to n passes, and each pass checks n elements. Best Case: O(n) - If array is already sorted, we only need one pass to confirm!',
          spaceExplanation: 'O(1) - We only need a few variables to track positions and swap elements. No extra arrays needed! This is called "in-place" sorting.'
        },
        whenToUse: [
          '✅ Learning algorithms for the first time (easiest to understand!)',
          '✅ Small datasets (under 10 elements)',
          '✅ Nearly sorted data (it\'s surprisingly fast!)',
          '✅ Teaching sorting concepts to beginners',
          '✅ When code simplicity matters more than speed'
        ],
        advantages: [
          '🎯 Extremely simple to understand and implement',
          '🎯 In-place sorting (no extra memory needed)',
          '🎯 Stable sort (maintains order of equal elements)',
          '🎯 Can detect if list is already sorted',
          '🎯 Great for educational purposes'
        ],
        disadvantages: [
          '⚠️ Very slow for large datasets',
          '⚠️ O(n²) makes it impractical for production',
          '⚠️ Many unnecessary comparisons',
          '⚠️ Not adaptive (doesn\'t take advantage of existing order)'
        ],
        realWorldExample: '🎒 Imagine organizing books on a shelf by height. You start at the left, and whenever you find a taller book before a shorter one, you swap them. After going through once, the tallest book is on the right. Keep doing this, and all books get sorted! Teachers use this to teach sorting because it\'s so visual and intuitive.',
        interviewTips: [
          '💡 ALWAYS mention the time complexity is O(n²) - interviewers expect this!',
          '💡 Explain that it\'s called "bubble" because larger elements bubble up',
          '💡 Mention it\'s stable (equal elements stay in same relative order)',
          '💡 Say "It\'s good for teaching but not for production"',
          '💡 Know the optimization: add a flag to detect if array is sorted early',
          '💡 Common interview question: "Why is bubble sort rarely used in practice?" Answer: O(n²) is too slow!',
          '💡 Be ready to code it on a whiteboard - it\'s only ~10 lines!',
          '💡 Mention real-world uses: Educational tools, very small datasets'
        ],
        codeExample: `function bubbleSort(arr) {
  const n = arr.length;
  
  // Outer loop: number of passes
  for (let i = 0; i < n - 1; i++) {
    let swapped = false; // Optimization flag
    
    // Inner loop: compare adjacent elements
    for (let j = 0; j < n - i - 1; j++) {
      // If left > right, swap them
      if (arr[j] > arr[j + 1]) {
        // Swap using destructuring
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        swapped = true;
      }
    }
    
    // If no swaps, array is sorted!
    if (!swapped) break;
  }
  
  return arr;
}

// Example usage:
const numbers = [5, 2, 8, 1, 9];
console.log(bubbleSort(numbers)); // [1, 2, 5, 8, 9]

// Time: O(n²) | Space: O(1) | Stable: Yes`
      }
    },
    {
      id: 2,
      name: 'Selection Sort - Find & Place',
      description: '🔍 Find the smallest, move it to front. Repeat! Simple and intuitive sorting method.',
      difficulty: 'Easy',
      icon: '🎯',
      algorithm: 'selection',
      locked: true,
      requiredStars: 2,
      bestScore: 0,
      completed: false,
      tutorial: {
        whatIsIt: '🎯 Selection Sort works by repeatedly finding the minimum element from the unsorted portion and placing it at the beginning. It divides the array into two parts: a sorted portion (left) and an unsorted portion (right). In each pass, we SELECT the minimum from the unsorted part and move it to the sorted part.',
        howItWorks: `Step-by-step process:

1️⃣ Find the smallest element in the entire array
2️⃣ Swap it with the first position
3️⃣ Now the first position is sorted! ✓
4️⃣ Find the smallest in the remaining unsorted part
5️⃣ Swap it with the second position
6️⃣ Continue until entire array is sorted

Imagine you're organizing a deck of cards:
- Look through ALL cards, find the smallest
- Put it on the table (sorted pile)
- Look through remaining cards, find the next smallest
- Add it to your sorted pile
- Repeat until all cards are sorted!`,
        complexity: {
          time: 'O(n²)',
          space: 'O(1)',
          timeExplanation: 'Always O(n²) in ALL cases! Unlike bubble sort, it doesn\'t get faster for sorted arrays. We always make n passes, and each pass scans n elements to find the minimum. That\'s n × n = n².',
          spaceExplanation: 'O(1) - We only need one extra variable to remember the index of the minimum. Very memory efficient! It\'s an in-place sort.'
        },
        whenToUse: [
          '✅ When memory writes are expensive (minimizes number of swaps)',
          '✅ Small datasets where simplicity matters',
          '✅ When you want to minimize the number of swaps',
          '✅ Teaching sorting algorithms',
          '✅ Sorting linked lists (better than bubble sort)'
        ],
        advantages: [
          '🎯 Simple to understand and implement',
          '🎯 Minimizes number of swaps (at most n swaps)',
          '🎯 In-place sorting (O(1) space)',
          '🎯 Works well with linked lists',
          '🎯 Performance is predictable (always same time)'
        ],
        disadvantages: [
          '⚠️ O(n²) time complexity is slow',
          '⚠️ Not stable (can change order of equal elements)',
          '⚠️ Doesn\'t adapt to sorted data',
          '⚠️ Not efficient for large datasets',
          '⚠️ Requires many comparisons even if nearly sorted'
        ],
        realWorldExample: '🏆 Think of a talent show where judges give scores. The host wants to announce winners in order. They look at ALL scores, find the highest (1st place), announce them. Then look at remaining scores, find the next highest (2nd place), and so on. That\'s selection sort - repeatedly selecting the best from what\'s left!',
        interviewTips: [
          '💡 Mention: "Selection sort makes fewer swaps than bubble sort"',
          '💡 Key difference: Bubble moves elements one step, Selection moves directly to final position',
          '💡 Important: It\'s NOT stable (equal elements may change relative order)',
          '💡 Say: "Good when swap operations are expensive"',
          '💡 Always O(n²), even for sorted arrays (no best case optimization)',
          '💡 Common question: "Compare with bubble sort" - Answer: Fewer swaps, but still O(n²)',
          '💡 Name comes from "selecting" the minimum repeatedly',
          '💡 Real-world use: When memory writes are costly (like flash memory)'
        ],
        codeExample: `function selectionSort(arr) {
  const n = arr.length;
  
  // Outer loop: position to fill
  for (let i = 0; i < n - 1; i++) {
    // Assume current position has minimum
    let minIndex = i;
    
    // Find actual minimum in unsorted part
    for (let j = i + 1; j < n; j++) {
      if (arr[j] < arr[minIndex]) {
        minIndex = j; // Update minimum index
      }
    }
    
    // Swap minimum to its final position
    if (minIndex !== i) {
      [arr[i], arr[minIndex]] = [arr[minIndex], arr[i]];
    }
  }
  
  return arr;
}

// Example:
const numbers = [64, 25, 12, 22, 11];
console.log(selectionSort(numbers)); // [11, 12, 22, 25, 64]

// Time: O(n²) always | Space: O(1) | Stable: No`
      }
    },
    {
      id: 3,
      name: 'Insertion Sort - Card Sorting',
      description: '🃏 Like sorting playing cards in your hand! Pick one, insert it in the right spot.',
      difficulty: 'Medium',
      icon: '🎴',
      algorithm: 'insertion',
      locked: true,
      requiredStars: 5,
      bestScore: 0,
      completed: false,
      tutorial: {
        whatIsIt: '🎴 Insertion Sort builds the final sorted array one item at a time. It\'s exactly like how you sort playing cards in your hand! You pick up one card at a time and INSERT it into its correct position among the cards you\'ve already sorted. This is one of the most intuitive sorting algorithms because it mimics how humans naturally sort.',
        howItWorks: `Step-by-step process:

1️⃣ Start with the second element (first is already "sorted")
2️⃣ Save this element as the "key" to insert
3️⃣ Compare with elements before it (the sorted portion)
4️⃣ Shift larger elements one position to the right
5️⃣ When you find the correct spot, insert the key
6️⃣ Move to the next element and repeat
7️⃣ Continue until all elements are processed

Real-world analogy - Sorting playing cards:
- You hold cards 2, 5, 7 in your left hand (sorted)
- You pick up 4 with your right hand
- You see 7 > 4, so you shift 7 right
- You see 5 > 4, so you shift 5 right
- You see 2 < 4, so you insert 4 after 2
- Now you have 2, 4, 5, 7 sorted!`,
        complexity: {
          time: 'O(n²)',
          space: 'O(1)',
          timeExplanation: 'Worst Case: O(n²) when array is reverse sorted - each element must be compared with all previous elements. Average Case: O(n²) - typically n²/4 comparisons. Best Case: O(n) when array is already sorted - we just scan through once! This makes it great for nearly sorted data.',
          spaceExplanation: 'O(1) - We only need one extra variable to hold the "key" element we\'re inserting. All sorting is done in-place. Very memory efficient!'
        },
        whenToUse: [
          '✅ Small to medium datasets (under 100 elements)',
          '✅ Nearly sorted arrays (it\'s VERY fast here!)',
          '✅ Data that arrives one at a time (online sorting)',
          '✅ When simplicity and stability are needed',
          '✅ Adaptive sorting is required',
          '✅ Hybrid algorithms like TimSort use it for small chunks'
        ],
        advantages: [
          '🎯 Simple and intuitive (easy to understand)',
          '🎯 Stable sort (maintains order of equal elements)',
          '🎯 In-place sorting (O(1) space)',
          '🎯 Adaptive - O(n) for nearly sorted data!',
          '🎯 Online algorithm (can sort data as it arrives)',
          '🎯 Efficient for small datasets',
          '🎯 Low overhead, good cache locality'
        ],
        disadvantages: [
          '⚠️ O(n²) for large datasets',
          '⚠️ Slow for reverse sorted arrays',
          '⚠️ More writes than selection sort',
          '⚠️ Not suitable for large datasets'
        ],
        realWorldExample: '🎮 Imagine you\'re organizing saved game files by date. As each new save is created, you insert it into the right chronological position in your list. You don\'t re-sort everything - just find where the new save belongs and slide it in! This is exactly how insertion sort works, making it perfect for maintaining sorted lists as new elements arrive.',
        interviewTips: [
          '💡 Mention the "playing cards" analogy - interviewers love this!',
          '💡 Key strength: Adaptive! O(n) for nearly sorted data',
          '💡 Say: "Best for small datasets or online sorting"',
          '💡 Important: It\'s stable (maintains order of equal elements)',
          '💡 Used in hybrid algorithms like TimSort (Python\'s default)',
          '💡 Common question: "When would you use insertion sort?" Answer: Nearly sorted data or small datasets',
          '💡 Better than bubble/selection for most practical cases',
          '💡 Efficient when array is already partially sorted',
          '💡 Real-world: Used in hybrid sorts for chunks < 10-20 elements'
        ],
        codeExample: `function insertionSort(arr) {
  const n = arr.length;
  
  // Start from second element (first is "sorted")
  for (let i = 1; i < n; i++) {
    const key = arr[i]; // Element to insert
    let j = i - 1; // Start of sorted portion
    
    // Shift elements greater than key to the right
    while (j >= 0 && arr[j] > key) {
      arr[j + 1] = arr[j]; // Shift right
      j--;
    }
    
    // Insert key at correct position
    arr[j + 1] = key;
  }
  
  return arr;
}

// Example:
const cards = [5, 2, 4, 6, 1, 3];
console.log(insertionSort(cards)); // [1, 2, 3, 4, 5, 6]

// Time: O(n) to O(n²) | Space: O(1) | Stable: Yes
// Best for: nearly sorted data, small arrays`
      }
    },
    {
      id: 4,
      name: 'Quick Sort - Divide & Conquer',
      description: '⚡ Pick a pivot, partition around it! Fast and efficient for large datasets.',
      difficulty: 'Hard',
      icon: '⚡',
      algorithm: 'quick',
      locked: true,
      requiredStars: 8,
      bestScore: 0,
      completed: false,
      tutorial: {
        whatIsIt: '⚡ Quick Sort is one of the FASTEST sorting algorithms! It uses a clever "divide and conquer" strategy: pick a PIVOT element, rearrange the array so all smaller elements are on the left and all larger elements are on the right, then recursively sort both sides. It\'s the algorithm of choice for many programming languages and libraries because of its excellent average-case performance.',
        howItWorks: `Step-by-step process:

1️⃣ Pick a PIVOT element (usually last, first, or middle)
2️⃣ PARTITION: Rearrange array around pivot:
   - All elements < pivot go to the left
   - All elements > pivot go to the right
   - Pivot is now in its final sorted position!
3️⃣ RECURSIVELY apply the same process to left side
4️⃣ RECURSIVELY apply the same process to right side
5️⃣ Base case: Arrays of size 0 or 1 are already sorted

Visual example: [3, 7, 8, 5, 2, 1, 9, 6, 4]
- Pick pivot: 4
- Partition: [3, 2, 1] 4 [7, 8, 5, 9, 6]
- Sort left: [1, 2, 3]
- Sort right: [5, 6, 7, 8, 9]
- Result: [1, 2, 3, 4, 5, 6, 7, 8, 9] ✓`,
        complexity: {
          time: 'O(n log n)',
          space: 'O(log n)',
          timeExplanation: 'Average/Best Case: O(n log n) - We partition (O(n)) at each level, and there are log n levels in a balanced tree. Worst Case: O(n²) - happens if pivot is always smallest/largest (rare with random pivot). This is why it\'s called "Quick" - average case is very fast!',
          spaceExplanation: 'O(log n) for recursion stack - each recursive call needs stack space. With balanced partitions, we get log n depth. Can be O(n) in worst case with unbalanced partitions. Not truly in-place due to recursion.'
        },
        whenToUse: [
          '✅ Large datasets where speed matters',
          '✅ Average case is critical (not worst case)',
          '✅ In-place sorting preferred (low memory)',
          '✅ When stability is NOT required',
          '✅ General-purpose sorting',
          '✅ Virtual memory environment (good cache locality)',
          '✅ Production systems (most languages use it)'
        ],
        advantages: [
          '🎯 Very fast average case O(n log n)',
          '🎯 In-place sorting (minimal extra memory)',
          '🎯 Cache efficient (good locality of reference)',
          '🎯 Works well with virtual memory',
          '🎯 Practical performance is excellent',
          '🎯 Easy to implement',
          '🎯 Parallelizes well'
        ],
        disadvantages: [
          '⚠️ O(n²) worst case (though rare)',
          '⚠️ Not stable (equal elements may swap)',
          '⚠️ Recursion overhead (O(log n) space)',
          '⚠️ Sensitive to pivot choice',
          '⚠️ Bad performance for sorted arrays (without randomization)'
        ],
        realWorldExample: '📦 Imagine sorting packages by weight in a warehouse. You pick a medium-weight package as reference (pivot), then quickly separate all lighter packages to one side and all heavier packages to the other side. Now you recursively do the same for each group. This is much faster than comparing every package with every other package! Amazon\'s sorting facilities use similar divide-and-conquer strategies.',
        interviewTips: [
          '💡 MUST mention: Average O(n log n), Worst O(n²)',
          '💡 Explain partitioning clearly - it\'s the key concept',
          '💡 Pivot choice matters: random pivot avoids O(n²)',
          '💡 Say: "Industry standard, used in C++, Java, etc."',
          '💡 Know the difference: Quick Sort vs Merge Sort',
          '💡 Trade-off: Not stable, but faster in practice than merge sort',
          '💡 Common question: "Why O(n²) worst case?" Answer: Bad pivot choices',
          '💡 Optimization: Use insertion sort for small subarrays (< 10)',
          '💡 Can go wrong: Stack overflow if not tail-recursive',
          '💡 Real-world: Most standard libraries use introsort (quick + heap)'
        ],
        codeExample: `function quickSort(arr, low = 0, high = arr.length - 1) {
  if (low < high) {
    // Partition and get pivot index
    const pivotIndex = partition(arr, low, high);
    
    // Recursively sort left and right
    quickSort(arr, low, pivotIndex - 1);
    quickSort(arr, pivotIndex + 1, high);
  }
  return arr;
}

function partition(arr, low, high) {
  const pivot = arr[high]; // Choose last as pivot
  let i = low - 1; // Index of smaller element
  
  for (let j = low; j < high; j++) {
    // If current element ≤ pivot
    if (arr[j] <= pivot) {
      i++;
      [arr[i], arr[j]] = [arr[j], arr[i]]; // Swap
    }
  }
  
  // Place pivot in correct position
  [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
  return i + 1; // Return pivot index
}

// Example:
const arr = [10, 7, 8, 9, 1, 5];
console.log(quickSort(arr)); // [1, 5, 7, 8, 9, 10]

// Time: O(n log n) avg | Space: O(log n) | Stable: No`
      }
    },
    {
      id: 5,
      name: 'Merge Sort - Split & Merge',
      description: '🔀 Divide array in half, sort each half, merge them! Guaranteed O(n log n) performance.',
      difficulty: 'Hard',
      icon: '🔀',
      algorithm: 'merge',
      locked: true,
      requiredStars: 11,
      bestScore: 0,
      completed: false,
      tutorial: {
        whatIsIt: '🔀 Merge Sort is a reliable, stable sorting algorithm that ALWAYS runs in O(n log n) time! It uses divide-and-conquer: recursively split the array in half until you have arrays of size 1, then merge them back together in sorted order. Unlike Quick Sort, it has guaranteed performance - no worst case to worry about!',
        howItWorks: `Step-by-step process:

DIVIDE PHASE (Splitting):
1️⃣ Split array into two halves
2️⃣ Recursively split each half
3️⃣ Continue until arrays are size 1 (base case)
4️⃣ Arrays of size 1 are already sorted!

CONQUER PHASE (Merging):
5️⃣ Merge two sorted arrays into one sorted array
6️⃣ Compare first elements of each array
7️⃣ Take the smaller one, add to result
8️⃣ Continue until both arrays are merged
9️⃣ Recursively merge all the way up

Example: [38, 27, 43, 3]
Split:    [38, 27] [43, 3]
Split:    [38] [27] [43] [3]
Merge:    [27, 38] [3, 43]
Merge:    [3, 27, 38, 43] ✓`,
        complexity: {
          time: 'O(n log n)',
          space: 'O(n)',
          timeExplanation: 'ALWAYS O(n log n) in all cases! We split log n times (halving creates a tree of height log n), and merging at each level takes O(n). So it\'s n × log n. Best, Average, and Worst cases are all the same - this predictability is a huge advantage!',
          spaceExplanation: 'O(n) - We need auxiliary arrays to merge. Each merge operation needs temporary storage. This is the main disadvantage - not in-place like quick sort. However, this extra space guarantees stability.'
        },
        whenToUse: [
          '✅ When guaranteed O(n log n) is required',
          '✅ Stability is important (preserve order of equals)',
          '✅ Large datasets',
          '✅ Linked lists (O(1) merge!)',
          '✅ External sorting (sorting files on disk)',
          '✅ Parallel/distributed sorting',
          '✅ When worst-case performance matters'
        ],
        advantages: [
          '🎯 Guaranteed O(n log n) in ALL cases',
          '🎯 Stable sort (maintains relative order)',
          '🎯 Predictable performance',
          '🎯 Excellent for linked lists',
          '🎯 Parallelizes perfectly',
          '🎯 Used in external sorting',
          '🎯 No worst-case degradation'
        ],
        disadvantages: [
          '⚠️ O(n) extra space required',
          '⚠️ Not in-place sorting',
          '⚠️ Slower than quick sort in practice',
          '⚠️ More overhead for small arrays',
          '⚠️ Copying arrays takes time'
        ],
        realWorldExample: '📚 Imagine you need to alphabetize 1 million records. You split them into 1000 files of 1000 records each, sort each file individually, then merge them all together in order. This "external merge sort" is exactly how databases sort huge datasets that don\'t fit in memory! Version control systems like Git also use merge sort when combining branches because stability matters.',
        interviewTips: [
          '💡 CRITICAL: Always O(n log n) - this is the key selling point',
          '💡 Mention: Stable sort (important for complex objects)',
          '💡 Trade-off: O(n) space vs O(n log n) guaranteed time',
          '💡 Say: "Used in Java Arrays.sort() for objects"',
          '💡 Comparison: Faster than quick sort in worst case, slower in average',
          '💡 Perfect for linked lists (no extra space needed!)',
          '💡 External sorting: Merge sort dominates',
          '💡 Common question: "Merge sort vs Quick sort?" - Stability vs Speed',
          '💡 Can be parallelized easily (divide-conquer is parallel-friendly)',
          '💡 Used in TimSort (Python) as the main component'
        ],
        codeExample: `function mergeSort(arr) {
  // Base case: array of length 0 or 1
  if (arr.length <= 1) return arr;
  
  // Divide: split in half
  const mid = Math.floor(arr.length / 2);
  const left = arr.slice(0, mid);
  const right = arr.slice(mid);
  
  // Conquer: recursively sort both halves
  return merge(mergeSort(left), mergeSort(right));
}

function merge(left, right) {
  const result = [];
  let i = 0, j = 0;
  
  // Compare and merge
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) {
      result.push(left[i++]); // Take from left
    } else {
      result.push(right[j++]); // Take from right
    }
  }
  
  // Add remaining elements
  return result.concat(left.slice(i)).concat(right.slice(j));
}

// Example:
const arr = [12, 11, 13, 5, 6, 7];
console.log(mergeSort(arr)); // [5, 6, 7, 11, 12, 13]

// Time: O(n log n) always | Space: O(n) | Stable: Yes`
      }
    },
    {
      id: 6,
      name: 'Binary Search - Smart Finding',
      description: '🔎 Find elements in sorted arrays FAST! Cut search space in half each time. O(log n) magic!',
      difficulty: 'Medium',
      icon: '🔍',
      algorithm: 'binary',
      locked: true,
      requiredStars: 14,
      bestScore: 0,
      completed: false,
      tutorial: {
        whatIsIt: '🔍 Binary Search is one of the most powerful search algorithms! Instead of checking every element (linear search), it cuts the search space IN HALF with each comparison. This makes it incredibly fast - searching 1 million elements takes only ~20 comparisons! The catch? The array must be SORTED first. It\'s the algorithm that makes dictionary lookups, database indexes, and Google searches so fast.',
        howItWorks: `Step-by-step process:

1️⃣ Start with the MIDDLE element of sorted array
2️⃣ Compare target with middle element
3️⃣ THREE POSSIBILITIES:
   ✅ If target == middle: FOUND! Return index
   ⬅️ If target < middle: Search in LEFT half
   ➡️ If target > middle: Search in RIGHT half
4️⃣ Repeat with the chosen half
5️⃣ Continue until found or search space is empty

Example: Find 31 in [3, 7, 15, 23, 31, 42, 57, 68, 91]
Step 1: Check middle (31) ✓ FOUND!

Example: Find 42 in [3, 7, 15, 23, 31, 42, 57, 68, 91]
Step 1: Check middle (31) → 42 > 31, go right
Step 2: Check middle of [42, 57, 68, 91] → (57)
Step 3: 42 < 57, go left
Step 4: Check (42) ✓ FOUND!

Only 4 comparisons instead of 6!`,
        complexity: {
          time: 'O(log n)',
          space: 'O(1) or O(log n)',
          timeExplanation: 'O(log n) - Every comparison cuts the search space in half! Search 1000 elements? ~10 comparisons. Search 1 million? ~20 comparisons. This is why it\'s SO fast. Best case is O(1) if we find it immediately. Worst/Average is O(log n). This logarithmic behavior is the same as balanced binary trees.',
          spaceExplanation: 'Iterative: O(1) - just a few variables. Recursive: O(log n) - recursion stack depth equals number of times we can halve the array. Prefer iterative for space efficiency!'
        },
        whenToUse: [
          '✅ Searching in SORTED arrays (REQUIRED!)',
          '✅ Large datasets where speed matters',
          '✅ Repeated searches on same data',
          '✅ Finding insertion points',
          '✅ Range queries',
          '✅ When O(n) is too slow',
          '✅ Database indexes, B-trees'
        ],
        advantages: [
          '🎯 Extremely fast - O(log n)',
          '🎯 Much better than linear search O(n)',
          '🎯 Simple to implement',
          '🎯 Predictable performance',
          '🎯 Works with any comparable data',
          '🎯 Foundation for many algorithms',
          '🎯 Minimal memory usage'
        ],
        disadvantages: [
          '⚠️ Requires sorted array (overhead if unsorted)',
          '⚠️ Only works with random access (not linked lists)',
          '⚠️ Overkill for very small arrays',
          '⚠️ Tricky edge cases (off-by-one errors common)'
        ],
        realWorldExample: '📖 Finding a word in a dictionary! You don\'t start at page 1 and check every word. You open to the middle - if your word comes before that, you search the left half, otherwise the right half. Then you repeat, each time cutting the remaining pages in half. That\'s why you can find any word in seconds even though there are 100,000+ words! Phone books, library catalogs, and Google\'s search index all use variations of binary search.',
        interviewTips: [
          '💡 CRITICAL: Array MUST be sorted - mention this first!',
          '💡 Time complexity O(log n) - understand WHY (halving)',
          '💡 Watch for off-by-one errors: mid = left + (right - left) / 2',
          '💡 Handle edge cases: empty array, not found, duplicates',
          '💡 Know both iterative and recursive implementations',
          '💡 Common variants: Lower bound, upper bound, rotated arrays',
          '💡 Say: "Foundation for binary search tree operations"',
          '💡 Comparison: O(log n) vs linear O(n) - show the math!',
          '💡 Common question: "When would you NOT use binary search?" Answer: Unsorted data or linked lists',
          '💡 Real applications: Git bisect, database indexes, LeetCode problems!'
        ],
        codeExample: `// Iterative approach (preferred)
function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  
  while (left <= right) {
    // Avoid overflow: mid = left + (right-left)/2
    const mid = Math.floor(left + (right - left) / 2);
    
    if (arr[mid] === target) {
      return mid; // Found!
    } else if (arr[mid] < target) {
      left = mid + 1; // Search right half
    } else {
      right = mid - 1; // Search left half
    }
  }
  
  return -1; // Not found
}

// Recursive approach
function binarySearchRecursive(arr, target, left = 0, right = arr.length - 1) {
  if (left > right) return -1; // Base case: not found
  
  const mid = Math.floor(left + (right - left) / 2);
  
  if (arr[mid] === target) return mid;
  if (arr[mid] < target) {
    return binarySearchRecursive(arr, target, mid + 1, right);
  }
  return binarySearchRecursive(arr, target, left, mid - 1);
}

// Example:
const sorted = [1, 3, 5, 7, 9, 11, 13, 15];
console.log(binarySearch(sorted, 7));  // 3
console.log(binarySearch(sorted, 14)); // -1

// Time: O(log n) | Space: O(1) iterative, O(log n) recursive`
      }
    },
    {
      id: 7,
      name: 'Big O Complexity Master',
      description: '🧮 Master time & space complexity! Interactive quiz to match code with Big O. Learn by playing!',
      difficulty: 'Medium',
      icon: '📊',
      algorithm: 'complexity',
      locked: false,
      requiredStars: 0,
      bestScore: 0,
      completed: false,
      tutorial: {
        whatIsIt: '📊 Big O Notation is the language we use to describe algorithm efficiency! It tells us how algorithm performance changes as input size grows. Think of it as a way to compare algorithms objectively - not based on your computer\'s speed, but on fundamental mathematical properties. Mastering Big O is ESSENTIAL for coding interviews and becoming a great developer!',
        howItWorks: `🎯 Understanding Big O - The Complete Guide:

📈 WHAT IS BIG O?
Big O describes the WORST-CASE scenario - how slow can it get?
- O(1): Constant - Same time regardless of input size
- O(log n): Logarithmic - Halves the problem each step
- O(n): Linear - Check each element once
- O(n log n): Linearithmic - Efficient sorting
- O(n²): Quadratic - Nested loops
- O(2ⁿ): Exponential - Doubles with each addition
- O(n!): Factorial - Permutations (VERY slow!)

🧮 HOW TO CALCULATE:

1️⃣ Count the operations:
   for (let i = 0; i < n; i++) { } // O(n) - runs n times
   
2️⃣ Nested loops multiply:
   for (let i = 0; i < n; i++) {
     for (let j = 0; j < n; j++) { } // O(n²)
   }
   
3️⃣ Sequential operations add:
   for (let i = 0; i < n; i++) { }     // O(n)
   for (let j = 0; j < n; j++) { }     // O(n)
   // Total: O(n) + O(n) = O(2n) = O(n) ✓
   
4️⃣ Drop constants and lower terms:
   O(2n + 5) → O(n)
   O(n² + n) → O(n²)
   O(5) → O(1)

💾 SPACE COMPLEXITY:
Measures MEMORY usage:
- O(1): Fixed variables only
- O(n): Array of size n
- O(n²): 2D array n×n
- O(log n): Recursion depth (binary search)

🎓 MEMORIZATION TRICKS:

📝 "If Then" Rules:
- IF you loop once → THEN O(n)
- IF nested loop → THEN multiply: O(n²), O(n³)
- IF dividing problem in half → THEN O(log n)
- IF divide + conquer with merge → THEN O(n log n)
- IF generating all combinations → THEN O(2ⁿ)

🎯 Quick Recognition:
- Array access arr[i] → O(1)
- Loop through array → O(n)
- Two nested loops → O(n²)
- Binary search → O(log n)
- Merge/Quick sort → O(n log n)
- Fibonacci recursion → O(2ⁿ)`,
        complexity: {
          time: 'Learning Tool',
          space: 'Learning Tool',
          timeExplanation: `🎮 INTERACTIVE COMPLEXITY CALCULATOR:

Try these patterns:

PATTERN 1: Simple Loop
for (i=0; i<n; i++) sum += arr[i];
→ Loop runs n times = O(n) ✓

PATTERN 2: Nested Loops
for (i=0; i<n; i++)
  for (j=0; j<n; j++)
    compare(i,j);
→ Outer n × Inner n = O(n²) ✓

PATTERN 3: Halving
while (n > 1) n = n/2;
→ How many times to halve? log₂(n) = O(log n) ✓

PATTERN 4: Recursive Tree
function fib(n) {
  if (n<=1) return n;
  return fib(n-1) + fib(n-2);
}
→ Tree branches = O(2ⁿ) ⚠️

PATTERN 5: Sorting
Split array, merge sorted halves
→ log(n) splits × n merges = O(n log n) ✓`,
          spaceExplanation: `💾 MEMORY USAGE PATTERNS:

SPACE RULE 1: Variables
int x, y, z; → O(1) constant space ✓

SPACE RULE 2: Arrays
int[] arr = new int[n]; → O(n) space ✓

SPACE RULE 3: 2D Arrays
int[][] matrix = new int[n][n]; → O(n²) ✓

SPACE RULE 4: Recursion Stack
function recurse(n) {
  if (n==0) return;
  recurse(n-1);
}
→ Call stack depth n = O(n) ✓

SPACE RULE 5: Binary Recursion
function binarySearch(arr, left, right)
→ Stack depth log(n) = O(log n) ✓`
        },
        whenToUse: [
          '✅ Coding interviews (ESSENTIAL!)',
          '✅ Choosing between algorithms',
          '✅ Optimizing slow code',
          '✅ Estimating if solution will scale',
          '✅ System design decisions',
          '✅ Understanding trade-offs',
          '✅ Technical discussions'
        ],
        advantages: [
          '🎯 Universal language for efficiency',
          '🎯 Machine-independent comparison',
          '🎯 Predicts scalability',
          '🎯 Interview necessity',
          '🎯 Helps identify bottlenecks',
          '🎯 Mathematical precision'
        ],
        disadvantages: [
          '⚠️ Ignores constant factors (sometimes matter!)',
          '⚠️ Worst-case focus (average might differ)',
          '⚠️ Doesn\'t account for cache, memory access',
          '⚠️ Small inputs may differ from theory'
        ],
        realWorldExample: '🏃‍♂️ Imagine searching phone contacts. Linear search (O(n)) means checking each contact one-by-one - fine for 10 friends, terrible for 10,000. Binary search (O(log n)) on sorted contacts means checking ~13 contacts max for 10,000 names! Facebook, Google, Netflix all optimize using Big O analysis. A small O(n²) algorithm could crash their servers, but O(n log n) handles billions of users. Understanding Big O helps you build systems that scale!',
        interviewTips: [
          '💡 ALWAYS analyze time AND space complexity',
          '💡 Start with brute force, then optimize',
          '💡 Common question: "What\'s the Big O?" - Answer immediately!',
          '💡 Worst, average, best cases may differ',
          '💡 Say: "This is O(n²) which is too slow for n>1000"',
          '💡 Know: O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2ⁿ)',
          '💡 Recursion space = recursion depth',
          '💡 Hash tables are O(1) average, O(n) worst',
          '💡 Dynamic programming trades space for time',
          '💡 Practice: Calculate complexity of every algorithm you learn!'
        ],
        codeExample: `// 🎯 Big O Examples - Can you identify each?

// Example 1: O(1) - Constant
function getFirst(arr) {
  return arr[0]; // Always one operation
}

// Example 2: O(n) - Linear
function printAll(arr) {
  for (let i = 0; i < arr.length; i++) {
    console.log(arr[i]); // Loop runs n times
  }
}

// Example 3: O(n²) - Quadratic
function printPairs(arr) {
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length; j++) {
      console.log(arr[i], arr[j]); // n × n operations
    }
  }
}

// Example 4: O(log n) - Logarithmic
function binarySearch(arr, target) {
  let left = 0, right = arr.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  } // Halves search space each iteration
  return -1;
}

// Example 5: O(n log n) - Linearithmic
function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid)); // log n splits
  const right = mergeSort(arr.slice(mid));
  return merge(left, right); // n merges per level
}

// Example 6: O(2ⁿ) - Exponential (SLOW!)
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n-1) + fibonacci(n-2); // 2 branches
}

// 🧮 SPACE COMPLEXITY EXAMPLES:

// O(1) Space
function sum(arr) {
  let total = 0; // Only one variable
  for (let num of arr) total += num;
  return total;
}

// O(n) Space
function double(arr) {
  const result = []; // New array of size n
  for (let num of arr) result.push(num * 2);
  return result;
}

// O(log n) Space - Recursion
function binarySearchRecursive(arr, target, l=0, r=arr.length-1) {
  if (l > r) return -1;
  const mid = Math.floor((l + r) / 2);
  if (arr[mid] === target) return mid;
  // Stack depth = log n
  return arr[mid] < target 
    ? binarySearchRecursive(arr, target, mid+1, r)
    : binarySearchRecursive(arr, target, l, mid-1);
}

/* 🎓 COMPLEXITY CHEAT SHEET:
 * 
 * Array/String:
 * - Access: O(1)
 * - Search: O(n)
 * - Insert/Delete: O(n)
 * 
 * Hash Table:
 * - Search/Insert/Delete: O(1) average
 * 
 * Binary Search Tree (balanced):
 * - Search/Insert/Delete: O(log n)
 * 
 * Sorting:
 * - Bubble/Selection/Insertion: O(n²)
 * - Merge/Quick/Heap: O(n log n)
 * 
 * Graph (V=vertices, E=edges):
 * - BFS/DFS: O(V + E)
 */`
      }
    },
    {
      id: 8,
      name: 'Heap Sort - Priority Power',
      description: '🏔️ Build a heap, extract max repeatedly! Fast O(n log n) with O(1) space. Priority queue magic!',
      difficulty: 'Hard',
      icon: '🗻',
      algorithm: 'heap',
      locked: true,
      requiredStars: 20,
      bestScore: 0,
      completed: false,
      tutorial: {
        whatIsIt: '🏔️ Heap Sort uses a special tree structure called a "heap" to sort data! A max-heap is a complete binary tree where each parent is larger than its children. Think of it as a mountain where the peak (root) is always the highest value. By repeatedly extracting the peak and rebuilding the heap, we sort the array! It combines the best of selection sort (in-place) and merge sort (O(n log n)).',
        howItWorks: `Step-by-step process:

PHASE 1: BUILD MAX-HEAP 🏗️
1️⃣ Convert array into a max-heap structure
2️⃣ "Heapify" from bottom-up
3️⃣ Ensure every parent > children
4️⃣ Root now contains maximum element!

PHASE 2: EXTRACT & SORT 📊
5️⃣ Swap root (max) with last element
6️⃣ Reduce heap size by 1
7️⃣ Heapify root to restore heap property
8️⃣ Repeat until heap is empty
9️⃣ Array is now sorted ascending!

Visual Example: [4, 10, 3, 5, 1]

Build Heap:     10
               /  \\
              5    3
             / \\
            4   1
            
Extract 10: Put at end [1, 5, 3, 4, 10]
Heapify:        5
               / \\
              4   3
             /
            1
            
Extract 5: [1, 4, 3, 5, 10]
Continue...
Final: [1, 3, 4, 5, 10] ✓`,
        complexity: {
          time: 'O(n log n)',
          space: 'O(1)',
          timeExplanation: 'O(n log n) in ALL cases! Building heap is O(n), then we do n extractions, each requiring O(log n) heapify. Total: O(n) + n × O(log n) = O(n log n). Unlike quick sort, there\'s NO worst case degradation! Unlike merge sort, we don\'t need extra space!',
          spaceExplanation: 'O(1) - In-place sorting! We sort within the original array by treating part of it as a heap. No auxiliary arrays needed. This is a huge advantage over merge sort. Only a few variables for tracking indices.'
        },
        whenToUse: [
          '✅ Guaranteed O(n log n) with O(1) space needed',
          '✅ When merge sort uses too much memory',
          '✅ When quick sort\'s O(n²) risk unacceptable',
          '✅ Priority queues implementation',
          '✅ Finding k largest/smallest elements',
          '✅ Embedded systems (limited memory)',
          '✅ Real-time systems (predictable performance)'
        ],
        advantages: [
          '🎯 O(n log n) worst case guaranteed',
          '🎯 In-place sorting - O(1) extra space',
          '🎯 No recursion overhead',
          '🎯 Foundation for priority queues',
          '🎯 Better than quick sort worst case',
          '🎯 Better than merge sort space usage',
          '🎯 Predictable performance'
        ],
        disadvantages: [
          '⚠️ Not stable (equal elements may swap)',
          '⚠️ Poor cache locality compared to quick sort',
          '⚠️ Higher constant factors than quick sort',
          '⚠️ Complicated implementation',
          '⚠️ Slower than quick sort in practice'
        ],
        realWorldExample: '🏥 Hospital Emergency Room! Patients arrive and are assigned priority (1-10). The most critical patient (heap root) is always treated first. When they\'re done, the next most critical becomes root. This "priority queue" is implemented using a heap! Operating systems use heaps for task scheduling, network routers use heaps for packet prioritization, and video games use heaps for event management. Whenever you need "always access the maximum/minimum efficiently," think heap!',
        interviewTips: [
          '💡 Heap = Complete binary tree with heap property',
          '💡 Max-heap: parent ≥ children, Min-heap: parent ≤ children',
          '💡 Array representation: left child = 2i+1, right = 2i+2, parent = (i-1)/2',
          '💡 Build heap is O(n), not O(n log n)! (common misconception)',
          '💡 Heapify operation is O(log n)',
          '💡 Priority queues are THE use case for heaps',
          '💡 Comparison: Better space than merge, better worst-case than quick',
          '💡 Not stable - mention when stability matters',
          '💡 Common question: "Why not always use heap sort?" Answer: Cache locality and constants',
          '💡 Python heapq, Java PriorityQueue use heaps internally'
        ],
        codeExample: `function heapSort(arr) {
  const n = arr.length;
  
  // Build max heap (rearrange array)
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    heapify(arr, n, i);
  }
  
  // Extract elements from heap one by one
  for (let i = n - 1; i > 0; i--) {
    // Move current root to end
    [arr[0], arr[i]] = [arr[i], arr[0]];
    
    // Heapify reduced heap
    heapify(arr, i, 0);
  }
  
  return arr;
}

function heapify(arr, n, i) {
  let largest = i; // Root
  const left = 2 * i + 1;
  const right = 2 * i + 2;
  
  // If left child > root
  if (left < n && arr[left] > arr[largest]) {
    largest = left;
  }
  
  // If right child > largest so far
  if (right < n && arr[right] > arr[largest]) {
    largest = right;
  }
  
  // If largest is not root
  if (largest !== i) {
    [arr[i], arr[largest]] = [arr[largest], arr[i]];
    
    // Recursively heapify affected sub-tree
    heapify(arr, n, largest);
  }
}

// Priority Queue using Heap
class MaxHeap {
  constructor() {
    this.heap = [];
  }
  
  // Insert O(log n)
  insert(val) {
    this.heap.push(val);
    this.bubbleUp(this.heap.length - 1);
  }
  
  // Extract Max O(log n)
  extractMax() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();
    
    const max = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.bubbleDown(0);
    return max;
  }
  
  // Peek O(1)
  peek() {
    return this.heap[0];
  }
  
  bubbleUp(index) {
    const element = this.heap[index];
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIndex];
      if (element <= parent) break;
      this.heap[index] = parent;
      index = parentIndex;
    }
    this.heap[index] = element;
  }
  
  bubbleDown(index) {
    const length = this.heap.length;
    const element = this.heap[index];
    
    while (true) {
      let leftIndex = 2 * index + 1;
      let rightIndex = 2 * index + 2;
      let largest = index;
      
      if (leftIndex < length && this.heap[leftIndex] > this.heap[largest]) {
        largest = leftIndex;
      }
      if (rightIndex < length && this.heap[rightIndex] > this.heap[largest]) {
        largest = rightIndex;
      }
      if (largest === index) break;
      
      [this.heap[index], this.heap[largest]] = 
        [this.heap[largest], this.heap[index]];
      index = largest;
    }
  }
}

// Example:
const arr = [12, 11, 13, 5, 6, 7];
console.log(heapSort(arr)); // [5, 6, 7, 11, 12, 13]

// Time: O(n log n) always | Space: O(1) | Stable: No
// Use case: Priority queues, k largest elements`
      }
    },
    {
      id: 9,
      name: 'Stack - LIFO Logic',
      description: '📚 Last In, First Out! Like a stack of plates. Push, pop, peek - master fundamental operations!',
      difficulty: 'Easy',
      icon: '📚',
      algorithm: 'stack',
      locked: true,
      requiredStars: 23,
      bestScore: 0,
      completed: false,
      tutorial: {
        whatIsIt: '📚 A Stack is a fundamental data structure that follows LIFO (Last In, First Out) principle - like a stack of plates! You can only add (push) or remove (pop) from the top. The last item you put in is the first one you take out. Stacks are everywhere in computing: function calls, undo/redo, browser history, expression evaluation, and recursion implementation!',
        howItWorks: `Core operations:

PUSH 📥 - Add to top: O(1)
1️⃣ Add element to top of stack
2️⃣ Increment size counter
3️⃣ Top pointer moves up

POP 📤 - Remove from top: O(1)
1️⃣ Remove element from top
2️⃣ Decrement size counter
3️⃣ Top pointer moves down
4️⃣ Return removed element

PEEK/TOP 👁️ - View top without removing: O(1)
1️⃣ Return top element
2️⃣ Don't modify stack

isEmpty() - Check if empty: O(1)
size() - Get number of elements: O(1)

Visual Example:
         | 5 | ← Top (last in)
         | 3 |
         | 8 |
         | 1 | ← Bottom (first in)
         -----
         
push(7):    | 7 | ← new top
            | 5 |
            | 3 |
            | 8 |
            | 1 |
            
pop():      | 5 | ← top (7 removed)
            | 3 |
            | 8 |
            | 1 |`,
        complexity: {
          time: 'All operations O(1)',
          space: 'O(n)',
          timeExplanation: 'Push, Pop, Peek are all O(1) constant time! This is the magic of stacks - super fast operations. We only work with the top element, never need to traverse the stack. This makes stacks extremely efficient for their use cases.',
          spaceExplanation: 'O(n) where n is number of elements in stack. We need to store all elements. Can be implemented with array (fixed size) or linked list (dynamic size).'
        },
        whenToUse: [
          '✅ Function call management (call stack)',
          '✅ Undo/Redo operations',
          '✅ Browser back button (history)',
          '✅ Balanced parentheses checking',
          '✅ Expression evaluation (postfix)',
          '✅ Backtracking algorithms (maze, puzzles)',
          '✅ Depth-First Search (DFS)',
          '✅ Tower of Hanoi problem'
        ],
        advantages: [
          '🎯 O(1) for all operations',
          '🎯 Simple and intuitive',
          '🎯 Memory efficient',
          '🎯 Natural for recursion simulation',
          '🎯 Essential for many algorithms',
          '🎯 Thread-safe versions available'
        ],
        disadvantages: [
          '⚠️ Limited access (only top element)',
          '⚠️ No random access by index',
          '⚠️ Fixed size if array-based',
          '⚠️ Can overflow if size limit'
        ],
        realWorldExample: '🍽️ Stack of plates in cafeteria! You always take the top plate (most recently added). Clean plates are added on top. You can\'t take a plate from the middle without removing all plates above it first! Similarly: Browser back button is a stack of URLs, Undo in text editor is a stack of changes, Function calls in a program create a call stack, Mathematical expression evaluation uses operator stack.',
        interviewTips: [
          '💡 LIFO = Last In, First Out (key concept)',
          '💡 All basic operations are O(1)',
          '💡 Common interview: "Implement stack using array/linked list"',
          '💡 Balanced parentheses problem uses stack',
          '💡 Call stack overflow happens with deep recursion',
          '💡 Stack vs Queue: Stack is LIFO, Queue is FIFO',
          '💡 min/max stack with O(1) operations - popular question!',
          '💡 Real-world: Every function call uses stack internally',
          '💡 DFS uses stack, BFS uses queue (remember this!)',
          '💡 Two stacks can implement a queue!'
        ],
        codeExample: `// Stack Implementation using Array
class Stack {
  constructor() {
    this.items = [];
  }
  
  // Push: O(1)
  push(element) {
    this.items.push(element);
  }
  
  // Pop: O(1)
  pop() {
    if (this.isEmpty()) return null;
    return this.items.pop();
  }
  
  // Peek: O(1)
  peek() {
    if (this.isEmpty()) return null;
    return this.items[this.items.length - 1];
  }
  
  // isEmpty: O(1)
  isEmpty() {
    return this.items.length === 0;
  }
  
  // Size: O(1)
  size() {
    return this.items.length;
  }
  
  // Clear: O(1)
  clear() {
    this.items = [];
  }
}

// Usage Example:
const stack = new Stack();
stack.push(1);
stack.push(2);
stack.push(3);
console.log(stack.peek());  // 3 (top)
console.log(stack.pop());   // 3 (removed)
console.log(stack.peek());  // 2 (new top)
console.log(stack.size());  // 2

// 🎯 Classic Problem: Balanced Parentheses
function isBalanced(str) {
  const stack = [];
  const pairs = { ')': '(', '}': '{', ']': '[' };
  
  for (let char of str) {
    // Opening bracket: push
    if ('({['.includes(char)) {
      stack.push(char);
    }
    // Closing bracket: check match
    else if (')}]'.includes(char)) {
      if (stack.length === 0) return false;
      if (stack.pop() !== pairs[char]) return false;
    }
  }
  
  return stack.length === 0; // Should be empty
}

console.log(isBalanced("({[]})"));   // true
console.log(isBalanced("({[})"));    // false

// 🎯 Min Stack with O(1) operations
class MinStack {
  constructor() {
    this.stack = [];
    this.minStack = [];
  }
  
  push(val) {
    this.stack.push(val);
    const min = this.minStack.length === 0 
      ? val 
      : Math.min(val, this.minStack[this.minStack.length - 1]);
    this.minStack.push(min);
  }
  
  pop() {
    this.stack.pop();
    this.minStack.pop();
  }
  
  top() {
    return this.stack[this.stack.length - 1];
  }
  
  getMin() {
    return this.minStack[this.minStack.length - 1];
  }
}

// All operations: O(1) time | O(n) space`
      }
    },
    {
      id: 10,
      name: 'Queue - FIFO Flow',
      description: '🎫 First In, First Out! Like standing in line. Enqueue, dequeue - essential for BFS and scheduling!',
      difficulty: 'Easy',
      icon: '🎫',
      algorithm: 'queue',
      locked: true,
      requiredStars: 26,
      bestScore: 0,
      completed: false,
      tutorial: {
        whatIsIt: '🎫 A Queue is a fundamental data structure following FIFO (First In, First Out) - like a line of people waiting! Elements are added at the back (rear) and removed from the front. Think of it as a fair waiting line: whoever arrives first gets served first. Queues are essential for: task scheduling, message queues, breadth-first search, print spooling, and handling requests!',
        howItWorks: `Core operations:

ENQUEUE 📥 - Add to back/rear: O(1)
1️⃣ Add element to rear
2️⃣ Increment size
3️⃣ Move rear pointer

DEQUEUE 📤 - Remove from front: O(1)
1️⃣ Remove element from front
2️⃣ Decrement size
3️⃣ Move front pointer
4️⃣ Return removed element

FRONT/PEEK 👁️ - View front: O(1)
1️⃣ Return front element
2️⃣ Don't modify queue

isEmpty() - Check if empty: O(1)
size() - Count elements: O(1)

Visual Example:
Front → [1] [8] [3] [5] ← Rear
        ↑ dequeue    ↑ enqueue
        
enqueue(7):
Front → [1] [8] [3] [5] [7] ← Rear

dequeue():
Front → [8] [3] [5] [7] ← Rear
        (1 was removed)`,
        complexity: {
          time: 'All operations O(1)',
          space: 'O(n)',
          timeExplanation: 'Enqueue and Dequeue are both O(1) constant time! We maintain front and rear pointers, so adding/removing is instant. No need to shift elements. This efficiency makes queues perfect for real-time processing.',
          spaceExplanation: 'O(n) for n elements in queue. Circular queue can reuse space efficiently. Linked list implementation has no size limit. Array implementation may waste space.'
        },
        whenToUse: [
          '✅ Breadth-First Search (BFS)',
          '✅ Task scheduling (CPU, disk)',
          '✅ Print queue management',
          '✅ Message queues (async processing)',
          '✅ Request handling (web servers)',
          '✅ Buffer for data streams',
          '✅ Level-order tree traversal',
          '✅ Handling concurrent requests'
        ],
        advantages: [
          '🎯 O(1) enqueue and dequeue',
          '🎯 Fair ordering (FIFO)',
          '🎯 Natural for scheduling',
          '🎯 Essential for BFS',
          '🎯 Simple concept',
          '🎯 Predictable behavior'
        ],
        disadvantages: [
          '⚠️ No random access',
          '⚠️ Only access front element',
          '⚠️ Array implementation can waste space',
          '⚠️ Fixed size if array-based'
        ],
        realWorldExample: '🎬 Movie theater ticket line! First person in line gets their ticket first (FIFO). Nobody cuts in line - that would break the queue! Similarly: Print spooler queues print jobs, Operating system queues processes for CPU time, Call center queues incoming calls, Drive-thru queues cars, Web servers queue requests, Message queues handle async tasks. Queues ensure FAIR and ORDERLY processing!',
        interviewTips: [
          '💡 FIFO = First In, First Out (opposite of stack)',
          '💡 Queue for BFS, Stack for DFS (critical to remember!)',
          '💡 Circular queue avoids wasted space',
          '💡 Common: "Implement queue using stacks" (2 stacks!)',
          '💡 Priority queue is heap, not regular queue',
          '💡 Deque = double-ended queue (add/remove both ends)',
          '💡 Real-world: Every waiting line is a queue',
          '💡 Message queues (RabbitMQ, Kafka) use this concept',
          '💡 Interview favorite: Sliding window maximum uses deque',
          '💡 Thread-safe queues needed for concurrent systems'
        ],
        codeExample: `// Queue Implementation using Array
class Queue {
  constructor() {
    this.items = [];
    this.front = 0;
  }
  
  // Enqueue: O(1)
  enqueue(element) {
    this.items.push(element);
  }
  
  // Dequeue: O(1) amortized
  dequeue() {
    if (this.isEmpty()) return null;
    const item = this.items[this.front];
    this.front++;
    
    // Cleanup to prevent memory leak
    if (this.front > this.items.length / 2) {
      this.items = this.items.slice(this.front);
      this.front = 0;
    }
    return item;
  }
  
  // Front/Peek: O(1)
  peek() {
    if (this.isEmpty()) return null;
    return this.items[this.front];
  }
  
  // isEmpty: O(1)
  isEmpty() {
    return this.front >= this.items.length;
  }
  
  // Size: O(1)
  size() {
    return this.items.length - this.front;
  }
}

// Usage:
const queue = new Queue();
queue.enqueue(1);
queue.enqueue(2);
queue.enqueue(3);
console.log(queue.dequeue()); // 1 (first in, first out)
console.log(queue.peek());    // 2 (new front)
console.log(queue.size());    // 2

// 🎯 Circular Queue (No waste!)
class CircularQueue {
  constructor(k) {
    this.queue = new Array(k);
    this.head = -1;
    this.tail = -1;
    this.size = k;
  }
  
  enqueue(value) {
    if (this.isFull()) return false;
    
    if (this.isEmpty()) {
      this.head = 0;
    }
    
    this.tail = (this.tail + 1) % this.size;
    this.queue[this.tail] = value;
    return true;
  }
  
  dequeue() {
    if (this.isEmpty()) return false;
    
    if (this.head === this.tail) {
      // Last element
      this.head = -1;
      this.tail = -1;
    } else {
      this.head = (this.head + 1) % this.size;
    }
    return true;
  }
  
  Front() {
    return this.isEmpty() ? -1 : this.queue[this.head];
  }
  
  Rear() {
    return this.isEmpty() ? -1 : this.queue[this.tail];
  }
  
  isEmpty() {
    return this.head === -1;
  }
  
  isFull() {
    return (this.tail + 1) % this.size === this.head;
  }
}

// 🎯 Queue using Two Stacks
class QueueWithStacks {
  constructor() {
    this.stack1 = []; // For enqueue
    this.stack2 = []; // For dequeue
  }
  
  enqueue(x) {
    this.stack1.push(x);
  }
  
  dequeue() {
    if (this.stack2.length === 0) {
      // Transfer from stack1 to stack2
      while (this.stack1.length > 0) {
        this.stack2.push(this.stack1.pop());
      }
    }
    return this.stack2.pop();
  }
  
  peek() {
    if (this.stack2.length === 0) {
      while (this.stack1.length > 0) {
        this.stack2.push(this.stack1.pop());
      }
    }
    return this.stack2[this.stack2.length - 1];
  }
}

// All operations: O(1) amortized | O(n) space`
      }
    },
    {
      id: 11,
      name: 'Linked List - Dynamic Chains',
      description: '🔗 Dynamic data structure! Insert, delete anywhere in O(1). No fixed size, pointer magic!',
      difficulty: 'Medium',
      icon: '⛓️',
      algorithm: 'linkedlist',
      locked: true,
      requiredStars: 29,
      bestScore: 0,
      completed: false,
      tutorial: {
        whatIsIt: '🔗 A Linked List is a linear data structure where elements (nodes) are connected via pointers/references - like a chain! Unlike arrays, elements aren\'t stored in contiguous memory. Each node contains data and a pointer to the next node. This makes insertion/deletion super efficient but gives up random access. There are Singly Linked Lists (one direction), Doubly Linked Lists (both directions), and Circular Linked Lists (last connects to first).',
        howItWorks: `Node Structure:
┌─────────┬──────────┐
│  Data   │   Next   │ → Points to next node
└─────────┴──────────┘

Singly Linked List:
Head → [1|→] → [2|→] → [3|→] → [4|null]

Operations:

INSERT AT HEAD: O(1)
1️⃣ Create new node
2️⃣ Point new node to current head
3️⃣ Update head to new node

INSERT AT POSITION: O(n)
1️⃣ Traverse to position-1
2️⃣ Point new node to next
3️⃣ Point previous to new node

DELETE: O(1) if you have reference, O(n) to find
1️⃣ Find node before target
2️⃣ Point its next to target's next
3️⃣ Target is now disconnected

SEARCH: O(n)
1️⃣ Start from head
2️⃣ Traverse until found or null
3️⃣ No binary search possible!

Doubly Linked List:
null ← [1] ↔ [2] ↔ [3] ↔ [4] → null
       ↑                      ↑
      Head                   Tail`,
        complexity: {
          time: 'Insert/Delete O(1), Search O(n)',
          space: 'O(n)',
          timeExplanation: 'Insert/Delete at known position: O(1) - just update pointers! Searching: O(n) - must traverse from head. No random access like arrays. Access by index: O(n) vs O(1) for arrays. Trade-off: Fast insertion/deletion vs slow search.',
          spaceExplanation: 'O(n) for n nodes + extra space for pointers. Each node needs extra memory for pointer(s). Singly linked list: 1 pointer per node. Doubly linked list: 2 pointers per node. More memory than arrays but dynamic size!'
        },
        whenToUse: [
          '✅ Frequent insertions/deletions',
          '✅ Unknown/changing size',
          '✅ No random access needed',
          '✅ Implementing Stack/Queue',
          '✅ Undo functionality',
          '✅ Memory allocation (OS)',
          '✅ Polynomial arithmetic',
          '✅ Browser history navigation'
        ],
        advantages: [
          '🎯 O(1) insertion/deletion at known position',
          '🎯 Dynamic size (no reallocation)',
          '🎯 No wasted memory',
          '🎯 Easy to implement Stack/Queue',
          '🎯 Can grow indefinitely',
          '🎯 Efficient memory usage pattern'
        ],
        disadvantages: [
          '⚠️ O(n) search and access',
          '⚠️ No random access',
          '⚠️ Extra memory for pointers',
          '⚠️ Not cache-friendly',
          '⚠️ Reverse traversal hard (singly)',
          '⚠️ More complex than arrays'
        ],
        realWorldExample: '🚂 Train with connected cars! Each car (node) is connected to the next. Easy to add/remove cars anywhere - just connect/disconnect the links! You can\'t instantly jump to car #50 - you must walk through all previous cars. Similarly: Music playlists (next/previous), Browser history (back/forward), Undo/redo (each action linked), Image viewer slideshows, Blockchain (blocks linked by hashes)!',
        interviewTips: [
          '💡 Reverse linked list - TOP interview question!',
          '💡 Detect cycle using Floyd\'s algorithm (slow/fast pointers)',
          '💡 Find middle using two pointers (slow = 1x, fast = 2x)',
          '💡 Merge two sorted lists - common question',
          '💡 Watch for: null pointer errors, losing references',
          '💡 Dummy node trick simplifies edge cases',
          '💡 Draw diagrams! Helps visualize pointer changes',
          '💡 O(1) space often means in-place pointer manipulation',
          '💡 Common: Remove nth from end, palindrome check',
          '💡 Know difference: Singly vs Doubly vs Circular'
        ],
        codeExample: `// Node Class
class Node {
  constructor(data) {
    this.data = data;
    this.next = null;
  }
}

// Singly Linked List
class LinkedList {
  constructor() {
    this.head = null;
    this.size = 0;
  }
  
  // Insert at head: O(1)
  insertFirst(data) {
    const newNode = new Node(data);
    newNode.next = this.head;
    this.head = newNode;
    this.size++;
  }
  
  // Insert at end: O(n)
  insertLast(data) {
    const newNode = new Node(data);
    if (!this.head) {
      this.head = newNode;
    } else {
      let current = this.head;
      while (current.next) {
        current = current.next;
      }
      current.next = newNode;
    }
    this.size++;
  }
  
  // Delete by value: O(n)
  delete(data) {
    if (!this.head) return;
    
    // If head needs to be deleted
    if (this.head.data === data) {
      this.head = this.head.next;
      this.size--;
      return;
    }
    
    let current = this.head;
    while (current.next) {
      if (current.next.data === data) {
        current.next = current.next.next;
        this.size--;
        return;
      }
      current = current.next;
    }
  }
  
  // Search: O(n)
  search(data) {
    let current = this.head;
    while (current) {
      if (current.data === data) return true;
      current = current.next;
    }
    return false;
  }
  
  // Print: O(n)
  print() {
    let current = this.head;
    const values = [];
    while (current) {
      values.push(current.data);
      current = current.next;
    }
    console.log(values.join(' → '));
  }
}

// Usage:
const list = new LinkedList();
list.insertFirst(3);
list.insertFirst(2);
list.insertFirst(1);
list.insertLast(4);
list.print(); // 1 → 2 → 3 → 4

// 🎯 REVERSE LINKED LIST (Interview Favorite!)
function reverse(head) {
  let prev = null;
  let current = head;
  
  while (current) {
    const next = current.next; // Save next
    current.next = prev;        // Reverse link
    prev = current;             // Move prev forward
    current = next;             // Move current forward
  }
  
  return prev; // New head
}

// 🎯 DETECT CYCLE (Floyd's Algorithm)
function hasCycle(head) {
  if (!head) return false;
  
  let slow = head;
  let fast = head;
  
  while (fast && fast.next) {
    slow = slow.next;        // Move 1 step
    fast = fast.next.next;   // Move 2 steps
    
    if (slow === fast) {
      return true; // Cycle detected!
    }
  }
  
  return false;
}

// 🎯 FIND MIDDLE
function findMiddle(head) {
  let slow = head;
  let fast = head;
  
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
  }
  
  return slow; // Middle node
}

// Insert/Delete: O(1) known position | Search: O(n)
// Space: O(n) | Dynamic size`
      }
    },
    {
      id: 12,
      name: 'Hash Table - Instant Lookup',
      description: '🗝️ O(1) search, insert, delete! Hash function magic. Perfect for caching and fast lookups!',
      difficulty: 'Medium',
      icon: '🗄️',
      algorithm: 'hashtable',
      locked: true,
      requiredStars: 32,
      bestScore: 0,
      completed: false,
      tutorial: {
        whatIsIt: '🗝️ Hash Table (Hash Map) is one of the MOST POWERFUL data structures! It provides O(1) average-case lookup, insertion, and deletion - nearly instant! The magic? A hash function converts keys into array indices. Think of it as a super-smart lookup table: given a key, immediately find the value. Used everywhere: databases, caches, compilers, password storage, blockchain, and more!',
        howItWorks: `Core Concept:

KEY → Hash Function → INDEX → VALUE
"John" → hash() → 42 → {age: 25, city: "NYC"}

Hash Function:
Converts any key to a valid array index
- Must be deterministic (same input → same output)
- Should distribute keys evenly
- Fast to compute

Example Hash Function:
hash("cat") = (c + a + t) % tableSize
hash("cat") = (99 + 97 + 116) % 10 = 2

Storage:
table[2] = "cat" → "small feline"

Collision Handling:

1️⃣ CHAINING (Linked lists at each index)
   [0] → null
   [1] → "dog"→"fog"  (collision!)
   [2] → "cat"
   
2️⃣ OPEN ADDRESSING (Find next empty slot)
   Linear probing: Try [i+1], [i+2], [i+3]...
   Quadratic probing: Try [i+1²], [i+2²], [i+3²]...
   Double hashing: Use second hash function

Load Factor = items / tableSize
- Keep < 0.75 for good performance
- Resize (rehash) when too full`,
        complexity: {
          time: 'O(1) average, O(n) worst',
          space: 'O(n)',
          timeExplanation: 'Average case ALL operations: O(1) - This is INCREDIBLE! Search, insert, delete all constant time! Worst case: O(n) - if all keys collide (rare with good hash function). This happens when hash function is poor or table is too full. With proper implementation, practically O(1)!',
          spaceExplanation: 'O(n) for n key-value pairs plus some overhead for the table. Need extra space to avoid collisions (load factor < 1). Empty slots waste memory but ensure speed. Trade-off: Memory for speed! Dynamic resizing helps optimize.'
        },
        whenToUse: [
          '✅ Fast lookups needed (O(1)!)',
          '✅ Implementing caches',
          '✅ Counting frequencies',
          '✅ Finding duplicates',
          '✅ Database indexing',
          '✅ Two sum / complement problems',
          '✅ Anagram grouping',
          '✅ Symbol tables (compilers)'
        ],
        advantages: [
          '🎯 O(1) average lookup, insert, delete',
          '🎯 Flexible key types',
          '🎯 Natural key-value pairing',
          '🎯 Cache implementation',
          '🎯 Fast duplicate detection',
          '🎯 Essential for many algorithms'
        ],
        disadvantages: [
          '⚠️ O(n) worst case',
          '⚠️ No ordering of keys',
          '⚠️ Hash collisions can degrade performance',
          '⚠️ Extra memory overhead',
          '⚠️ Poor cache locality',
          '⚠️ Hash function quality critical'
        ],
        realWorldExample: '📞 Phone Contact List! Type a name, instantly get the phone number - no scrolling through 1000 contacts! The phone uses a hash table: your contact name is hashed to an index, and the number is retrieved in O(1). Similarly: Dictionary lookups (word → definition), DNS (domain → IP), Password verification (username → hashed password), Caching (URL → cached page), Compiler symbol tables (variable name → memory location), Blockchain transactions (hash → block data)!',
        interviewTips: [
          '💡 Two Sum problem - classic hash table question!',
          '💡 Always mention: Average O(1), Worst O(n)',
          '💡 Hash collision handling: chaining vs open addressing',
          '💡 Load factor determines performance',
          '💡 Common: First non-repeating character, anagrams',
          '💡 LRU Cache combines hash table + doubly linked list',
          '💡 Python dict, Java HashMap, JavaScript Map',
          '💡 Hash function quality is CRITICAL',
          '💡 Not suitable when you need sorted data',
          '💡 Perfect for: "Have I seen this before?" questions'
        ],
        codeExample: `// Hash Table with Chaining
class HashTable {
  constructor(size = 53) {
    this.table = new Array(size);
    this.size = size;
  }
  
  // Hash function
  _hash(key) {
    let hash = 0;
    for (let char of key.toString()) {
      hash = (hash + char.charCodeAt(0) * 31) % this.size;
    }
    return hash;
  }
  
  // Set: O(1) average
  set(key, value) {
    const index = this._hash(key);
    
    if (!this.table[index]) {
      this.table[index] = [];
    }
    
    // Check if key exists, update if so
    for (let i = 0; i < this.table[index].length; i++) {
      if (this.table[index][i][0] === key) {
        this.table[index][i][1] = value;
        return;
      }
    }
    
    // Add new key-value pair
    this.table[index].push([key, value]);
  }
  
  // Get: O(1) average
  get(key) {
    const index = this._hash(key);
    const bucket = this.table[index];
    
    if (bucket) {
      for (let pair of bucket) {
        if (pair[0] === key) {
          return pair[1];
        }
      }
    }
    return undefined;
  }
  
  // Delete: O(1) average
  delete(key) {
    const index = this._hash(key);
    const bucket = this.table[index];
    
    if (bucket) {
      for (let i = 0; i < bucket.length; i++) {
        if (bucket[i][0] === key) {
          bucket.splice(i, 1);
          return true;
        }
      }
    }
    return false;
  }
  
  // Has: O(1) average
  has(key) {
    return this.get(key) !== undefined;
  }
}

// Usage:
const ht = new HashTable();
ht.set("name", "Alice");
ht.set("age", 25);
ht.set("city", "NYC");
console.log(ht.get("name")); // "Alice"
console.log(ht.has("age"));  // true
ht.delete("city");

// 🎯 TWO SUM (Classic Hash Table Problem!)
function twoSum(nums, target) {
  const map = new Map(); // num → index
  
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    
    if (map.has(complement)) {
      return [map.get(complement), i]; // Found!
    }
    
    map.set(nums[i], i);
  }
  
  return [];
}

console.log(twoSum([2, 7, 11, 15], 9)); // [0, 1]
// Time: O(n) | Space: O(n)

// 🎯 FIRST NON-REPEATING CHARACTER
function firstUniqChar(s) {
  const freq = new Map();
  
  // Count frequencies
  for (let char of s) {
    freq.set(char, (freq.get(char) || 0) + 1);
  }
  
  // Find first with frequency 1
  for (let i = 0; i < s.length; i++) {
    if (freq.get(s[i]) === 1) {
      return i;
    }
  }
  
  return -1;
}

// 🎯 GROUP ANAGRAMS
function groupAnagrams(strs) {
  const map = new Map();
  
  for (let str of strs) {
    const sorted = str.split('').sort().join('');
    
    if (!map.has(sorted)) {
      map.set(sorted, []);
    }
    map.get(sorted).push(str);
  }
  
  return Array.from(map.values());
}

console.log(groupAnagrams(["eat","tea","tan","ate","nat","bat"]));
// [["eat","tea","ate"], ["tan","nat"], ["bat"]]

// All operations: O(1) average | O(n) space`
      }
    },
    {
      id: 13,
      name: 'Binary Tree Traversal',
      description: '🌳 In-order, Pre-order, Post-order, Level-order! Master tree navigation. Recursion mastery!',
      difficulty: 'Hard',
      icon: '🌲',
      algorithm: 'binarytree',
      locked: true,
      requiredStars: 35,
      bestScore: 0,
      completed: false,
      tutorial: {
        whatIsIt: '🌳 Binary Trees are hierarchical data structures where each node has at most 2 children: left and right. Tree Traversal is the process of visiting every node systematically. There are 4 main traversal methods: In-Order (left-root-right), Pre-Order (root-left-right), Post-Order (left-right-root), and Level-Order (breadth-first). Each serves different purposes and is essential for tree operations!',
        howItWorks: `Binary Tree Structure:
        1
       / \\
      2   3
     / \\
    4   5

TRAVERSAL METHODS:

1️⃣ IN-ORDER (Left-Root-Right)
   Purpose: Gets nodes in sorted order (for BST!)
   Process: Left subtree → Root → Right subtree
   Result: 4, 2, 5, 1, 3
   Use: Printing BST in sorted order

2️⃣ PRE-ORDER (Root-Left-Right)
   Purpose: Copy tree, expression prefix
   Process: Root → Left subtree → Right subtree
   Result: 1, 2, 4, 5, 3
   Use: Creating a copy of tree

3️⃣ POST-ORDER (Left-Right-Root)
   Purpose: Delete tree, expression postfix
   Process: Left → Right → Root
   Result: 4, 5, 2, 3, 1
   Use: Deleting tree (delete children first!)

4️⃣ LEVEL-ORDER (BFS)
   Purpose: Level-by-level processing
   Process: Visit level 1, then level 2, etc.
   Result: 1, 2, 3, 4, 5
   Use: Finding shortest path, tree width

Implementation:
- In/Pre/Post-Order: Use RECURSION or STACK
- Level-Order: Use QUEUE`,
        complexity: {
          time: 'O(n)',
          space: 'O(h) to O(n)',
          timeExplanation: 'All traversals: O(n) where n = number of nodes. We must visit every node exactly once. Can\'t be faster - we need to see all nodes! Different traversals give different visit orders but same time complexity.',
          spaceExplanation: 'Recursive: O(h) for call stack, where h = height. Balanced tree: O(log n), Worst (skewed): O(n). Level-order with queue: O(w) where w = max width, worst case O(n). Iterative with explicit stack: O(h).'
        },
        whenToUse: [
          '✅ In-Order: Print BST sorted, validate BST',
          '✅ Pre-Order: Copy tree, serialize tree',
          '✅ Post-Order: Delete tree, evaluate expression',
          '✅ Level-Order: BFS, find level of node',
          '✅ All: Search, tree operations',
          '✅ Calculating height, diameter',
          '✅ Finding paths, ancestors'
        ],
        advantages: [
          '🎯 Systematic node visiting',
          '🎯 Different orders suit different needs',
          '🎯 Recursive solutions elegant',
          '🎯 Foundation for tree algorithms',
          '🎯 Easy to understand/implement',
          '🎯 Works on any tree structure'
        ],
        disadvantages: [
          '⚠️ Recursive = stack overflow risk',
          '⚠️ Not cache-friendly',
          '⚠️ O(n) time minimum',
          '⚠️ Iterative versions complex'
        ],
        realWorldExample: '📁 File System! In-Order: List files alphabetically. Pre-Order: Copy entire folder structure (create parent before children). Post-Order: Delete folder (delete files before folder itself). Level-Order: Show folder hierarchy level-by-level. Similarly: HTML DOM traversal, Expression tree evaluation (calculators), Compiler syntax trees, Organization charts, Family trees, Decision trees in AI!',
        interviewTips: [
          '💡 In-Order of BST gives SORTED output - remember this!',
          '💡 Pre-Order good for serialization/deserialization',
          '💡 Post-Order for tree deletion (children before parents)',
          '💡 Level-Order uses queue, others use stack/recursion',
          '💡 Common: Implement iteratively with explicit stack',
          '💡 Morris traversal: O(1) space but complex',
          '💡 Know recursive AND iterative implementations',
          '💡 Validate BST using in-order traversal',
          '💡 Serialize/deserialize tree - popular question',
          '💡 All traversals are O(n) time, differ in space'
        ],
        codeExample: `// Tree Node
class TreeNode {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

// 🎯 IN-ORDER (Left-Root-Right)
function inOrder(root, result = []) {
  if (!root) return result;
  
  inOrder(root.left, result);   // Left
  result.push(root.val);         // Root
  inOrder(root.right, result);   // Right
  
  return result;
}

// Iterative In-Order
function inOrderIterative(root) {
  const result = [];
  const stack = [];
  let current = root;
  
  while (current || stack.length) {
    // Go to leftmost node
    while (current) {
      stack.push(current);
      current = current.left;
    }
    
    current = stack.pop();
    result.push(current.val);
    current = current.right;
  }
  
  return result;
}

// 🎯 PRE-ORDER (Root-Left-Right)
function preOrder(root, result = []) {
  if (!root) return result;
  
  result.push(root.val);         // Root
  preOrder(root.left, result);   // Left
  preOrder(root.right, result);  // Right
  
  return result;
}

// 🎯 POST-ORDER (Left-Right-Root)
function postOrder(root, result = []) {
  if (!root) return result;
  
  postOrder(root.left, result);  // Left
  postOrder(root.right, result); // Right
  result.push(root.val);          // Root
  
  return result;
}

// 🎯 LEVEL-ORDER (BFS)
function levelOrder(root) {
  if (!root) return [];
  
  const result = [];
  const queue = [root];
  
  while (queue.length) {
    const levelSize = queue.length;
    const currentLevel = [];
    
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift();
      currentLevel.push(node.val);
      
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    
    result.push(currentLevel);
  }
  
  return result;
}

// Example Tree:     1
//                  / \\
//                 2   3
//                / \\
//               4   5

const root = new TreeNode(1);
root.left = new TreeNode(2);
root.right = new TreeNode(3);
root.left.left = new TreeNode(4);
root.left.right = new TreeNode(5);

console.log(inOrder(root));    // [4, 2, 5, 1, 3]
console.log(preOrder(root));   // [1, 2, 4, 5, 3]
console.log(postOrder(root));  // [4, 5, 2, 3, 1]
console.log(levelOrder(root)); // [[1], [2,3], [4,5]]

// 🎯 VALIDATE BST (using in-order)
function isValidBST(root) {
  const values = inOrder(root);
  for (let i = 1; i < values.length; i++) {
    if (values[i] <= values[i-1]) return false;
  }
  return true;
}

// 🎯 MAX DEPTH
function maxDepth(root) {
  if (!root) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}

// All: O(n) time | O(h) to O(n) space`
      }
    },
    {
      id: 14,
      name: 'Graph BFS - Breadth-First',
      description: '🕸️ Explore layer by layer! Shortest path finder. Queue-based traversal. Unweighted graphs!',
      difficulty: 'Hard',
      icon: '🌐',
      algorithm: 'bfs',
      locked: true,
      requiredStars: 38,
      bestScore: 0,
      completed: false,
      tutorial: {
        whatIsIt: '🕸️ Breadth-First Search (BFS) explores a graph LEVEL BY LEVEL - like ripples expanding in water! Starting from a source node, BFS visits all neighbors at distance 1, then all at distance 2, and so on. It uses a QUEUE (FIFO) to track which nodes to visit next. BFS is THE algorithm for finding shortest paths in unweighted graphs! Used in social networks ("friends of friends"), web crawlers, GPS navigation, and AI pathfinding.',
        howItWorks: `Algorithm Steps:

1️⃣ Start with source node in queue
2️⃣ Mark source as visited
3️⃣ While queue not empty:
   a) Dequeue front node
   b) Process/visit this node
   c) For each unvisited neighbor:
      - Mark as visited
      - Enqueue neighbor
4️⃣ Repeat until queue empty

Visual Example:
Graph:    A --- B --- E
          |     |
          C --- D

Starting from A:
Level 0: [A]
Level 1: [B, C]      (neighbors of A)
Level 2: [D, E]      (neighbors of B, C)

Visit order: A → B → C → D → E

Why Queue?
Queue ensures FIFO = closer nodes visited first
= Shortest path found first!

Key: Mark visited WHEN ADDING to queue,
     not when removing!`,
        complexity: {
          time: 'O(V + E)',
          space: 'O(V)',
          timeExplanation: 'O(V + E) where V = vertices (nodes), E = edges. We visit each vertex once (V), and explore each edge once (E). For adjacency matrix: O(V²). For adjacency list: O(V + E). This is optimal - can\'t avoid checking all connections!',
          spaceExplanation: 'O(V) for queue + visited set. Worst case: all vertices in queue at once (complete graph). Queue size never exceeds V. Visited set needs V booleans. Total: O(V).'
        },
        whenToUse: [
          '✅ Shortest path in unweighted graph',
          '✅ Level-order operations',
          '✅ Finding connected components',
          '✅ Check if graph is bipartite',
          '✅ Social network distance',
          '✅ Web crawler (breadth)',
          '✅ GPS navigation (unweighted)',
          '✅ Peer-to-peer networks'
        ],
        advantages: [
          '🎯 Shortest path in unweighted graphs',
          '🎯 Visits all reachable nodes',
          '🎯 Level-by-level processing',
          '🎯 Complete (finds solution if exists)',
          '🎯 Optimal for shallow solutions',
          '🎯 Simple to implement'
        ],
        disadvantages: [
          '⚠️ Memory intensive (queue grows)',
          '⚠️ Not suitable for weighted graphs',
          '⚠️ Slower than DFS for deep graphs',
          '⚠️ Finds shorter path, not cheapest (if weighted)'
        ],
        realWorldExample: '👥 "Six Degrees of Kevin Bacon"! Find shortest connection chain between any actor and Kevin Bacon. BFS explores: direct co-stars (1 degree), then their co-stars (2 degrees), etc. Facebook\'s "People You May Know" uses BFS: friends of friends! Similarly: LinkedIn connections, Twitter follower suggestions, Google Maps shortest route, Chess game trees (find mate in n moves), Puzzle solvers (Rubik\'s cube, sliding puzzles), Network packet routing!',
        interviewTips: [
          '💡 BFS for shortest path in unweighted graphs',
          '💡 Use QUEUE (not stack!) - critical!',
          '💡 Mark visited WHEN ADDING to queue',
          '💡 Common: Word ladder, rotting oranges, walls and gates',
          '💡 Level-order tree traversal IS BFS',
          '💡 BFS = Queue, DFS = Stack/Recursion',
          '💡 Check bipartite using BFS and 2-coloring',
          '💡 Connected components using BFS',
          '💡 Time: O(V+E), Space: O(V)',
          '💡 Bidirectional BFS for optimization'
        ],
        codeExample: `// Graph using Adjacency List
class Graph {
  constructor() {
    this.adjacencyList = new Map();
  }
  
  addVertex(vertex) {
    if (!this.adjacencyList.has(vertex)) {
      this.adjacencyList.set(vertex, []);
    }
  }
  
  addEdge(v1, v2) {
    this.adjacencyList.get(v1).push(v2);
    this.adjacencyList.get(v2).push(v1); // Undirected
  }
  
  // 🎯 BFS Implementation
  bfs(start) {
    const visited = new Set();
    const queue = [start];
    const result = [];
    
    visited.add(start);
    
    while (queue.length > 0) {
      const vertex = queue.shift();
      result.push(vertex);
      
      // Visit all neighbors
      for (let neighbor of this.adjacencyList.get(vertex)) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    
    return result;
  }
  
  // 🎯 Shortest Path (BFS)
  shortestPath(start, end) {
    const visited = new Set();
    const queue = [[start, [start]]]; // [node, path]
    
    visited.add(start);
    
    while (queue.length > 0) {
      const [vertex, path] = queue.shift();
      
      if (vertex === end) {
        return path; // Found shortest path!
      }
      
      for (let neighbor of this.adjacencyList.get(vertex)) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([neighbor, [...path, neighbor]]);
        }
      }
    }
    
    return null; // No path exists
  }
}

// Usage:
const graph = new Graph();
['A', 'B', 'C', 'D', 'E'].forEach(v => graph.addVertex(v));
graph.addEdge('A', 'B');
graph.addEdge('A', 'C');
graph.addEdge('B', 'D');
graph.addEdge('C', 'D');
graph.addEdge('D', 'E');

console.log(graph.bfs('A')); // ['A', 'B', 'C', 'D', 'E']
console.log(graph.shortestPath('A', 'E')); // ['A', 'B', 'D', 'E']

// 🎯 LEVEL-ORDER DISTANCE
function bfsWithLevels(graph, start) {
  const visited = new Set();
  const queue = [[start, 0]]; // [node, level]
  const levels = new Map();
  
  visited.add(start);
  
  while (queue.length > 0) {
    const [vertex, level] = queue.shift();
    levels.set(vertex, level);
    
    for (let neighbor of graph.adjacencyList.get(vertex)) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([neighbor, level + 1]);
      }
    }
  }
  
  return levels;
}

// 🎯 CHECK IF BIPARTITE (2-colorable)
function isBipartite(graph, start) {
  const color = new Map();
  const queue = [start];
  color.set(start, 0);
  
  while (queue.length > 0) {
    const vertex = queue.shift();
    
    for (let neighbor of graph.adjacencyList.get(vertex)) {
      if (!color.has(neighbor)) {
        color.set(neighbor, 1 - color.get(vertex));
        queue.push(neighbor);
      } else if (color.get(neighbor) === color.get(vertex)) {
        return false; // Same color = not bipartite
      }
    }
  }
  
  return true;
}

// Time: O(V + E) | Space: O(V)`
      }
    },
    {
      id: 15,
      name: 'Graph DFS - Depth-First',
      description: '🎯 Explore deep, then backtrack! Stack/recursion-based. Cycle detection, pathfinding, topological sort!',
      difficulty: 'Hard',
      icon: '🔦',
      algorithm: 'dfs',
      locked: true,
      requiredStars: 41,
      bestScore: 0,
      completed: false,
      tutorial: {
        whatIsIt: '🎯 Depth-First Search (DFS) explores a graph by going as DEEP as possible along each branch before backtracking! It\'s like exploring a maze: take a path until you hit a dead end, then backtrack and try another path. DFS uses a STACK (or recursion = implicit stack) to track the path. Essential for: cycle detection, topological sorting, finding connected components, solving puzzles, and maze navigation!',
        howItWorks: `Algorithm Steps:

RECURSIVE:
1️⃣ Mark current node as visited
2️⃣ Process current node
3️⃣ For each unvisited neighbor:
   - Recursively call DFS
4️⃣ Backtrack when no unvisited neighbors

ITERATIVE (with Stack):
1️⃣ Push start node to stack
2️⃣ While stack not empty:
   a) Pop node from stack
   b) If not visited:
      - Mark as visited
      - Process node
      - Push all unvisited neighbors
3️⃣ Repeat

Visual Example:
Graph:    A --- B --- E
          |     |
          C --- D

Starting from A (go deep first):
Path: A → B → E (dead end, backtrack)
      → D → C (dead end, backtrack)
      
Visit order: A → B → E → D → C
(Goes deep into B's branch first!)

DFS vs BFS:
DFS: Deep then backtrack (maze explorer)
BFS: Layer by layer (ripple effect)`,
        complexity: {
          time: 'O(V + E)',
          space: 'O(V)',
          timeExplanation: 'O(V + E) where V = vertices, E = edges. Visit each vertex once (V), traverse each edge once (E). Same as BFS! Adjacency matrix: O(V²). Adjacency list: O(V + E). We must examine all nodes and connections.',
          spaceExplanation: 'Recursive: O(V) for call stack in worst case (linear graph). Iterative: O(V) for explicit stack. Also O(V) for visited set. In practice, recursion depth = longest path in current branch.'
        },
        whenToUse: [
          '✅ Cycle detection',
          '✅ Topological sorting (DAG)',
          '✅ Finding connected components',
          '✅ Maze/puzzle solving',
          '✅ Path finding (any path, not shortest)',
          '✅ Strongly connected components',
          '✅ Sudoku solver',
          '✅ Backtracking problems'
        ],
        advantages: [
          '🎯 Memory efficient (only stores path)',
          '🎯 Natural recursion (elegant code)',
          '🎯 Good for decision trees',
          '🎯 Finds path quickly if deep',
          '🎯 Essential for topological sort',
          '🎯 Detects cycles easily'
        ],
        disadvantages: [
          '⚠️ Not shortest path',
          '⚠️ Can get stuck in wrong branch',
          '⚠️ Stack overflow risk (recursion)',
          '⚠️ Not optimal for shallow solutions'
        ],
        realWorldExample: '🏛️ Museum exploration! You enter a wing, explore every connected room deeply until you reach a dead end, then backtrack and try another wing. That\'s DFS! Similarly: File system search (explore folders deeply), Solving Sudoku (try a number, if it leads to conflict, backtrack), Chess AI (explore move deeply, evaluate), Tomtom GPS (find ANY route fast), Compiler dependency resolution, Web scraping (follow links deeply), Family tree search (descendants)!',
        interviewTips: [
          '💡 DFS for cycle detection - easier than BFS',
          '💡 Use STACK or RECURSION (not queue!)',
          '💡 Topological sort requires DFS',
          '💡 Common: Number of islands, clone graph, course schedule',
          '💡 DFS = Stack, BFS = Queue (memorize!)',
          '💡 Three states: unvisited, visiting, visited (cycle detection)',
          '💡 Pre-order, in-order, post-order matter in DFS',
          '💡 Backtracking IS DFS',
          '💡 Time same as BFS: O(V+E)',
          '💡 For trees: DFS is pre/in/post-order traversal'
        ],
        codeExample: `// Graph using Adjacency List
class Graph {
  constructor() {
    this.adjacencyList = new Map();
  }
  
  addVertex(vertex) {
    if (!this.adjacencyList.has(vertex)) {
      this.adjacencyList.set(vertex, []);
    }
  }
  
  addEdge(v1, v2) {
    this.adjacencyList.get(v1).push(v2);
    this.adjacencyList.get(v2).push(v1); // Undirected
  }
  
  // 🎯 DFS Recursive
  dfsRecursive(start, visited = new Set(), result = []) {
    visited.add(start);
    result.push(start);
    
    for (let neighbor of this.adjacencyList.get(start)) {
      if (!visited.has(neighbor)) {
        this.dfsRecursive(neighbor, visited, result);
      }
    }
    
    return result;
  }
  
  // 🎯 DFS Iterative (with Stack)
  dfsIterative(start) {
    const visited = new Set();
    const stack = [start];
    const result = [];
    
    while (stack.length > 0) {
      const vertex = stack.pop();
      
      if (!visited.has(vertex)) {
        visited.add(vertex);
        result.push(vertex);
        
        // Add neighbors to stack
        for (let neighbor of this.adjacencyList.get(vertex)) {
          if (!visited.has(neighbor)) {
            stack.push(neighbor);
          }
        }
      }
    }
    
    return result;
  }
  
  // 🎯 Detect Cycle (Undirected Graph)
  hasCycle() {
    const visited = new Set();
    
    const dfs = (vertex, parent) => {
      visited.add(vertex);
      
      for (let neighbor of this.adjacencyList.get(vertex)) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor, vertex)) return true;
        } else if (neighbor !== parent) {
          return true; // Cycle found!
        }
      }
      
      return false;
    };
    
    // Check all components
    for (let vertex of this.adjacencyList.keys()) {
      if (!visited.has(vertex)) {
        if (dfs(vertex, null)) return true;
      }
    }
    
    return false;
  }
  
  // 🎯 Find All Paths
  findAllPaths(start, end, visited = new Set(), path = []) {
    visited.add(start);
    path.push(start);
    const allPaths = [];
    
    if (start === end) {
      allPaths.push([...path]);
    } else {
      for (let neighbor of this.adjacencyList.get(start)) {
        if (!visited.has(neighbor)) {
          allPaths.push(
            ...this.findAllPaths(neighbor, end, visited, path)
          );
        }
      }
    }
    
    // Backtrack
    path.pop();
    visited.delete(start);
    
    return allPaths;
  }
}

// Usage:
const graph = new Graph();
['A', 'B', 'C', 'D', 'E'].forEach(v => graph.addVertex(v));
graph.addEdge('A', 'B');
graph.addEdge('A', 'C');
graph.addEdge('B', 'D');
graph.addEdge('C', 'D');
graph.addEdge('D', 'E');

console.log(graph.dfsRecursive('A')); // ['A', 'B', 'D', 'C', 'E']
console.log(graph.dfsIterative('A')); // ['A', 'C', 'D', 'E', 'B']
console.log(graph.hasCycle());         // true
console.log(graph.findAllPaths('A', 'E')); // All paths from A to E

// 🎯 TOPOLOGICAL SORT (Directed Acyclic Graph)
function topologicalSort(graph) {
  const visited = new Set();
  const stack = [];
  
  function dfs(vertex) {
    visited.add(vertex);
    
    for (let neighbor of graph.get(vertex)) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      }
    }
    
    stack.push(vertex); // Add after visiting all descendants
  }
  
  for (let vertex of graph.keys()) {
    if (!visited.has(vertex)) {
      dfs(vertex);
    }
  }
  
  return stack.reverse(); // Reverse to get correct order
}

// Time: O(V + E) | Space: O(V)`
      }
    }
  ];
  
  // AI Assistant
  showAIHelper: boolean = false;
  aiMessage: string = '';
  hints: string[] = [];
  currentHintIndex: number = 0;
  
  // Game completion
  isGameComplete: boolean = false;
  showCelebration: boolean = false;
  
  // Mobile detection
  isMobile: boolean = false;
  
  // Visualization
  visualizationSpeed: number = 600;
  isVisualizing: boolean = false;
  currentStep: number = 0;
  currentStepExplanation: string = '';
  
  // Confetti effect
  showConfetti: boolean = false;
  confettiItems: string[] = [];

  // Algorithm Tutorial Modal
  showAlgorithmModal: boolean = false;
  selectedTutorial: GameLevel | null = null;

  // Algorithm Comparison Modal
  showComparisonModal: boolean = false;
  algorithmComparisons = [
    {
      icon: '🫧',
      name: 'Bubble Sort',
      bestTime: 'O(n)',
      avgTime: 'O(n²)',
      worstTime: 'O(n²)',
      space: 'O(1)',
      stable: true
    },
    {
      icon: '🎯',
      name: 'Selection Sort',
      bestTime: 'O(n²)',
      avgTime: 'O(n²)',
      worstTime: 'O(n²)',
      space: 'O(1)',
      stable: false
    },
    {
      icon: '📥',
      name: 'Insertion Sort',
      bestTime: 'O(n)',
      avgTime: 'O(n²)',
      worstTime: 'O(n²)',
      space: 'O(1)',
      stable: true
    },
    {
      icon: '🔀',
      name: 'Merge Sort',
      bestTime: 'O(n log n)',
      avgTime: 'O(n log n)',
      worstTime: 'O(n log n)',
      space: 'O(n)',
      stable: true
    },
    {
      icon: '⚡',
      name: 'Quick Sort',
      bestTime: 'O(n log n)',
      avgTime: 'O(n log n)',
      worstTime: 'O(n²)',
      space: 'O(log n)',
      stable: false
    },
    {
      icon: '🌳',
      name: 'Heap Sort',
      bestTime: 'O(n log n)',
      avgTime: 'O(n log n)',
      worstTime: 'O(n log n)',
      space: 'O(1)',
      stable: false
    }
  ];

  constructor(private soundService: SoundEffectsService) { 
    this.loadProgress();
    this.soundEnabled = localStorage.getItem('dsaGame_soundEnabled') !== 'false';
    this.showCodeVisualization = localStorage.getItem('dsaGame_showCodeVisualization') === 'true';
    this.showComplexityMeter = localStorage.getItem('dsaGame_showComplexityMeter') !== 'false';
  }

  // Getter for completed levels count
  get completedLevelsCount(): number {
    return this.levels.filter(level => level.completed).length;
  }

  ngOnInit(): void {
    this.checkMobile();
    this.initializeBlockCountOptions();
    
    // Create throttled resize handler for better performance
    this.resizeHandler = () => {
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
      }
      this.resizeTimeout = setTimeout(() => {
        this.checkMobile();
        if (this.autoAdaptBlockCount) {
          this.updateBlockCountForScreen();
        }
      }, 150); // Throttle to 150ms
    };
    
    window.addEventListener('resize', this.resizeHandler, { passive: true });
    
    // Load guided mode preference from localStorage
    const savedGuidedMode = localStorage.getItem('dsaGame_guidedMode');
    if (savedGuidedMode !== null) {
      this.guidedMode = JSON.parse(savedGuidedMode);
    }
    
    // Load block count preferences
    const savedAutoAdapt = localStorage.getItem('dsaGame_autoAdaptBlockCount');
    if (savedAutoAdapt !== null) {
      this.autoAdaptBlockCount = JSON.parse(savedAutoAdapt);
    }
    const savedBlockCount = localStorage.getItem('dsaGame_customBlockCount');
    if (savedBlockCount !== null) {
      this.customBlockCount = JSON.parse(savedBlockCount);
    }
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    // Cancel complexity quiz RAF
    if (this.complexityRafId) {
      cancelAnimationFrame(this.complexityRafId);
    }
    // Clear resize timeout
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    // Properly remove resize listener
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    this.saveProgress();
    // Clean up body styles
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
  }

  checkMobile(): void {
    this.isMobile = window.innerWidth <= 768;
  }

  // Progress Management
  saveProgress(): void {
    const progress = {
      levels: this.levels.map(l => ({
        id: l.id,
        locked: l.locked,
        bestScore: l.bestScore,
        completed: l.completed
      })),
      totalStars: this.totalStars
    };
    localStorage.setItem('dsaGameProgress', JSON.stringify(progress));
  }

  loadProgress(): void {
    const saved = localStorage.getItem('dsaGameProgress');
    if (saved) {
      try {
        const progress = JSON.parse(saved);
        this.totalStars = progress.totalStars || 0;
        progress.levels.forEach((saved: any) => {
          const level = this.levels.find(l => l.id === saved.id);
          if (level) {
            level.locked = saved.locked;
            level.bestScore = saved.bestScore || 0;
            level.completed = saved.completed || false;
          }
        });
      } catch (e) {
        console.error('Failed to load progress', e);
      }
    }
  }

  unlockNextLevels(): void {
    this.levels.forEach(level => {
      if (this.totalStars >= level.requiredStars) {
        level.locked = false;
      }
    });
    this.saveProgress();
  }

  // Navigation
  showMenu(): void {
    this.currentView = 'menu';
    this.resetGame();
    // Scroll to top when returning to menu
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  selectLevel(level: GameLevel): void {
    if (level.locked) {
      this.aiMessage = `🔒 Unlock this level by earning ${level.requiredStars} stars! (You have ${this.totalStars})`;
      this.showAIHelper = true;
      setTimeout(() => {
        this.showAIHelper = false;
      }, 3000);
      return;
    }
    
    this.selectedLevel = level;
    
    // Check if this is the complexity quiz game
    if (level.algorithm === 'complexity') {
      this.startComplexityQuiz();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    // Regular sorting game
    this.currentSubLevel = 1;
    this.currentView = 'game';
    this.initializeGame(level);
    this.startTimer();
    // Scroll to top when entering game
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  selectSubLevel(subLevel: number): void {
    if (this.selectedLevel) {
      this.currentSubLevel = subLevel;
      this.initializeGame(this.selectedLevel);
      this.startTimer();
    }
  }

  showTutorial(): void {
    this.currentView = 'tutorial';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showLeaderboard(): void {
    this.currentView = 'leaderboard';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Algorithm Tutorial Methods
  showAlgorithmTutorial(event: Event, level: GameLevel): void {
    if (event) {
      event.stopPropagation(); // Prevent level selection
      event.preventDefault();
    }
    this.selectedTutorial = level;
    this.showAlgorithmModal = true;
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
  }

  closeAlgorithmTutorial(): void {
    this.showAlgorithmModal = false;
    // Restore body scroll
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
  }

  startGameFromTutorial(): void {
    if (this.selectedTutorial) {
      this.selectLevel(this.selectedTutorial);
      this.closeAlgorithmTutorial();
    }
  }

  // Game initialization
  initializeGame(level: GameLevel): void {
    this.resetGame();
    
    // Difficulty affects number of blocks
    let blockCount: number;
    
    // Check if custom block count is set or auto-adapt is enabled
    if (this.customBlockCount > 0 && !this.autoAdaptBlockCount) {
      // Use custom block count from settings
      blockCount = this.customBlockCount;
    } else if (this.autoAdaptBlockCount) {
      // Auto-adapt to screen size
      this.updateBlockCountForScreen();
      blockCount = this.customBlockCount;
    } else {
      // Use default difficulty-based block count
      if (this.currentSubLevel === 1) blockCount = this.isMobile ? 4 : 6;
      else if (this.currentSubLevel === 2) blockCount = this.isMobile ? 5 : 8;
      else blockCount = this.isMobile ? 6 : 10;
    }
    
    const values = Array.from({ length: blockCount }, (_, i) => i + 1);
    this.shuffleArray(values);
    
    this.blocks = values.map((value, index) => ({
      id: index,
      value: value,
      color: this.getBlockColor(value, blockCount),
      position: index,
      state: 'normal'
    }));
    
    this.generateHints(level.algorithm);
    this.generateAlgorithmSteps(level.algorithm);
    this.updateCurrentStep();
    
    // Initialize code visualization
    if (this.showCodeVisualization) {
      this.initializeAlgorithmCode(level.algorithm);
    }
    
    // Initialize algorithm-specific tracking variables
    if (level.algorithm === 'selection') {
      this.sortedUntilIndex = 0;
    } else if (level.algorithm === 'insertion') {
      this.sortedUntilIndex = 1; // First element is considered sorted
    }
    
    this.calculateNextExpectedMove();
    
    // If guided mode is enabled, highlight the first move
    if (this.guidedMode && this.expectedMove) {
      this.highlightValidTargets(this.expectedMove.sourceIndex);
    }
  }

  resetGame(): void {
    this.blocks = [];
    this.moves = 0;
    this.correctMoves = 0;
    this.incorrectMoves = 0;
    this.score = 0;
    this.timeElapsed = 0;
    this.stars = 0;
    this.isGameComplete = false;
    this.showCelebration = false;
    this.currentHintIndex = 0;
    this.currentStepIndex = 0;
    this.lastMoveCorrect = null;
    this.moveAffirmation = '';
    this.showAlgorithmGuide = true;
    this.expectedMove = null;
    this.currentPass = 0;
    this.currentCompareIndex = 0;
    this.sortedUntilIndex = -1;
    this.resetComplexityMeter();
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  startTimer(): void {
    this.timer = setInterval(() => {
      this.timeElapsed++;
    }, 1000);
  }

  // Block manipulation with algorithm validation
  onBlockDragStart(block: Block, event: any): void {
    const blockIndex = this.blocks.findIndex(b => b.id === block.id);
    
    // In guided mode, only allow dragging the expected block
    if (this.guidedMode && this.expectedMove) {
      if (blockIndex !== this.expectedMove.sourceIndex) {
        event.preventDefault();
        this.showMoveAffirmation('guided');
        return;
      }
    }
    
    if (this.isGameComplete || this.isVisualizing) {
      event.preventDefault();
      return;
    }
    
    this.draggedBlock = block;
    block.state = 'highlight';
    
    // Set up drag effect
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.dropEffect = 'move';
      
      // Create enhanced drag ghost with smooth animation
      try {
        const sourceElement = event.target.closest('.block') as HTMLElement;
        if (sourceElement) {
          const dragGhost = sourceElement.cloneNode(true) as HTMLElement;
          dragGhost.style.position = 'absolute';
          dragGhost.style.top = '-1000px';
          dragGhost.style.left = '-1000px';
          dragGhost.style.transform = 'scale(1.25) rotate(8deg)';
          dragGhost.style.opacity = '0.95';
          dragGhost.style.filter = 'brightness(1.3) drop-shadow(0 15px 40px rgba(102, 126, 234, 0.9))';
          dragGhost.style.transition = 'none';
          dragGhost.style.pointerEvents = 'none';
          dragGhost.style.zIndex = '10000';
          
          document.body.appendChild(dragGhost);
          
          // Set custom drag image
          const offsetX = sourceElement.offsetWidth / 2;
          const offsetY = sourceElement.offsetHeight / 2;
          event.dataTransfer.setDragImage(dragGhost, offsetX, offsetY);
          
          // Clean up ghost element
          setTimeout(() => {
            if (dragGhost && dragGhost.parentNode) {
              dragGhost.remove();
            }
          }, 100);
        }
      } catch (error) {
        console.log('Custom drag image not supported');
      }
    }
    
    // Add dragging class with delay for smooth transition
    requestAnimationFrame(() => {
      const blockElement = document.querySelector(`[data-value="${block.value}"]`) as HTMLElement;
      if (blockElement) {
        blockElement.classList.add('dragging');
        blockElement.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
      }
    });
    
    // Highlight valid drop targets
    this.highlightValidTargets(blockIndex);
  }

  onBlockDragOver(event: any): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    
    if (!this.draggedBlock) return;
    
    // Add smooth visual feedback to drop target
    const target = event.target as HTMLElement;
    const blockElement = target.closest('.block') as HTMLElement;
    
    if (blockElement && this.draggedBlock) {
      const targetValue = blockElement.getAttribute('data-value');
      
      if (targetValue && parseInt(targetValue) !== this.draggedBlock.value) {
        // Remove highlight from all blocks with smooth transition
        document.querySelectorAll('.block').forEach(b => {
          if (b !== blockElement) {
            b.classList.remove('drop-target-highlight');
            (b as HTMLElement).style.transition = 'all 0.3s ease';
          }
        });
        
        // Add highlight to current target with animation
        blockElement.classList.add('drop-target-highlight');
        blockElement.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
      }
    }
  }

  async onBlockDrop(targetBlock: Block, event: any): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    
    // Remove all drag-related classes with smooth animation
    document.querySelectorAll('.block').forEach(b => {
      (b as HTMLElement).style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
      b.classList.remove('dragging', 'drop-target-highlight');
    });
    
    if (!this.draggedBlock || this.draggedBlock.id === targetBlock.id) {
      if (this.draggedBlock) {
        this.draggedBlock.state = 'normal';
        this.clearTargetHighlights();
        this.draggedBlock = null;
      }
      return;
    }
    
    const sourceIndex = this.blocks.findIndex(b => b.id === this.draggedBlock!.id);
    const targetIndex = this.blocks.findIndex(b => b.id === targetBlock.id);
    
    // Check if this is the expected move in guided mode
    const isExpectedMove = this.guidedMode && this.expectedMove &&
                          sourceIndex === this.expectedMove.sourceIndex &&
                          targetIndex === this.expectedMove.targetIndex;
    
    const isCorrectMove = this.validateMove(this.draggedBlock, targetBlock);
    
    // In guided mode, only allow the expected move
    if (this.guidedMode && !isExpectedMove) {
      this.provideFeedback(this.draggedBlock, targetBlock, false);
      this.draggedBlock.state = 'normal';
      this.clearTargetHighlights();
      this.draggedBlock = null;
      return;
    }
    
    // Add drop animation
    const targetElement = document.querySelector(`[data-value="${targetBlock.value}"]`) as HTMLElement;
    if (targetElement) {
      targetElement.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
      targetElement.style.transform = 'scale(1.15)';
      setTimeout(() => {
        targetElement.style.transform = '';
      }, 300);
    }
    
    await this.swapBlocks(this.draggedBlock, targetBlock);
    this.moves++;
    
    this.provideFeedback(this.draggedBlock, targetBlock, isCorrectMove);
    
    // Update algorithm-specific tracking after successful guided move
    if (this.guidedMode && isExpectedMove && this.selectedLevel) {
      if (this.selectedLevel.algorithm === 'selection') {
        this.sortedUntilIndex++;
      }
      // For insertion sort, sortedUntilIndex is managed by calculateInsertionSortNextMove
    }
    
    this.draggedBlock = null;
    this.clearTargetHighlights();
    this.updateCurrentStep();
    this.calculateNextExpectedMove();
    this.checkCompletion();
  }

  onBlockDragEnd(event: any): void {
    // Clean up all drag-related visual states with smooth transitions
    requestAnimationFrame(() => {
      document.querySelectorAll('.block').forEach(b => {
        (b as HTMLElement).style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        b.classList.remove('dragging', 'drop-target-highlight');
        (b as HTMLElement).style.transform = '';
        (b as HTMLElement).style.opacity = '';
      });
    });
    
    // Reset dragged block state if it exists
    if (this.draggedBlock) {
      this.draggedBlock.state = 'normal';
      this.draggedBlock = null;
    }
    
    // Clear highlights
    this.clearTargetHighlights();
  }

  // Mobile touch handlers
  private touchDragElement: HTMLElement | null = null;
  private touchStartX: number = 0;
  private touchStartY: number = 0;

  onBlockTouchStart(block: Block, event: TouchEvent): void {
    if (this.isGameComplete || this.isVisualizing) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    this.draggedBlock = block;
    block.state = 'highlight';
    
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    
    // Create visual drag element
    const target = event.target as HTMLElement;
    const blockElement = target.classList.contains('block') ? target : target.closest('.block') as HTMLElement;
    
    if (blockElement) {
      const rect = blockElement.getBoundingClientRect();
      const clone = blockElement.cloneNode(true) as HTMLElement;
      
      clone.style.position = 'fixed';
      clone.style.top = `${rect.top}px`;
      clone.style.left = `${rect.left}px`;
      clone.style.width = `${rect.width}px`;
      clone.style.height = `${rect.height}px`;
      clone.style.zIndex = '9999';
      clone.style.opacity = '1';
      clone.style.pointerEvents = 'none';
      clone.style.transform = 'scale(1.15) rotate(3deg)';
      clone.style.transition = 'none';
      clone.style.filter = 'drop-shadow(0 10px 20px rgba(0,0,0,0.3)) brightness(1.2)';
      clone.classList.add('touch-dragging');
      
      document.body.appendChild(clone);
      this.touchDragElement = clone;
      
      // Hide original during drag with smooth fade
      blockElement.style.transition = 'opacity 0.2s ease';
      blockElement.style.opacity = '0.2';
    }
  }

  onBlockTouchMove(event: TouchEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (!this.touchDragElement || !this.draggedBlock) return;
    
    const touch = event.touches[0];
    
    // Smooth position update using touch coordinates directly
    this.touchDragElement.style.left = `${touch.clientX - (this.touchDragElement.offsetWidth / 2)}px`;
    this.touchDragElement.style.top = `${touch.clientY - (this.touchDragElement.offsetHeight / 2)}px`;
    
    // Highlight drop target with smooth animation
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const blockBelow = elementBelow?.closest('.block');
    
    // Clear all highlights first with smooth transitions
    document.querySelectorAll('.block').forEach(b => {
      if (!b.classList.contains('touch-dragging')) {
        (b as HTMLElement).style.transition = 'transform 0.2s ease';
        (b as HTMLElement).style.transform = '';
        (b as HTMLElement).classList.remove('drop-target-highlight');
      }
    });
    
    // Highlight valid drop target with glow
    if (blockBelow && !blockBelow.classList.contains('touch-dragging')) {
      (blockBelow as HTMLElement).style.transform = 'scale(1.1)';
      (blockBelow as HTMLElement).classList.add('drop-target-highlight');
      
      // Light haptic feedback when hovering over target
      if ('vibrate' in navigator) {
        navigator.vibrate(5);
      }
    }
  }

  async onBlockTouchEnd(targetBlock: Block, event: TouchEvent): Promise<void> {
    // Haptic feedback for drop
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
    
    // Restore original block opacity with smooth transitions
    const blockElements = document.querySelectorAll('.block');
    blockElements.forEach(b => {
      (b as HTMLElement).style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      (b as HTMLElement).style.opacity = '';
      (b as HTMLElement).style.transform = '';
      (b as HTMLElement).classList.remove('drop-target-highlight');
    });
    
    // Animate drag element before removal
    if (this.touchDragElement) {
      this.touchDragElement.style.transition = 'all 0.2s ease';
      this.touchDragElement.style.transform = 'scale(0.8)';
      this.touchDragElement.style.opacity = '0';
      
      setTimeout(() => {
        if (this.touchDragElement) {
          this.touchDragElement.remove();
          this.touchDragElement = null;
        }
      }, 200);
    }
    
    if (!this.draggedBlock) return;
    
    // Find the block under the touch point
    const touch = event.changedTouches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const blockElementBelow = elementBelow?.closest('.block') as HTMLElement;
    
    let actualTargetBlock = targetBlock;
    
    // If we found a different block under the touch point, use that instead
    if (blockElementBelow) {
      const dataValue = blockElementBelow.getAttribute('data-value');
      if (dataValue) {
        const foundBlock = this.blocks.find(b => b.value === parseInt(dataValue));
        if (foundBlock) {
          actualTargetBlock = foundBlock;
        }
      }
    }
    
    // Don't swap with itself
    if (this.draggedBlock.id === actualTargetBlock.id) {
      this.draggedBlock.state = 'normal';
      this.clearTargetHighlights();
      this.draggedBlock = null;
      return;
    }
    
    const sourceIndex = this.blocks.findIndex(b => b.id === this.draggedBlock!.id);
    const targetIndex = this.blocks.findIndex(b => b.id === actualTargetBlock.id);
    
    // Check if this is the expected move in guided mode
    const isExpectedMove = this.guidedMode && this.expectedMove &&
                          sourceIndex === this.expectedMove.sourceIndex &&
                          targetIndex === this.expectedMove.targetIndex;
    
    const isCorrectMove = this.validateMove(this.draggedBlock, actualTargetBlock);
    
    // In guided mode, only allow the expected move
    if (this.guidedMode && !isExpectedMove) {
      this.provideFeedback(this.draggedBlock, actualTargetBlock, false);
      this.draggedBlock.state = 'normal';
      this.clearTargetHighlights();
      this.draggedBlock = null;
      return;
    }
    
    await this.swapBlocks(this.draggedBlock, actualTargetBlock);
    this.moves++;
    
    this.provideFeedback(this.draggedBlock, actualTargetBlock, isCorrectMove);
    
    // Update algorithm-specific tracking after successful guided move
    if (this.guidedMode && isExpectedMove && this.selectedLevel) {
      if (this.selectedLevel.algorithm === 'selection') {
        this.sortedUntilIndex++;
      }
      // For insertion sort, sortedUntilIndex is managed by calculateInsertionSortNextMove
    }
    
    this.draggedBlock = null;
    this.clearTargetHighlights();
    this.updateCurrentStep();
    this.calculateNextExpectedMove();
    this.checkCompletion();
  }

  async swapBlocks(block1: Block, block2: Block): Promise<void> {
    // Add slow motion animation effect
    const index1 = this.blocks.findIndex(b => b.id === block1.id);
    const index2 = this.blocks.findIndex(b => b.id === block2.id);
    
    // Highlight blocks being swapped
    block1.state = 'compare';
    block2.state = 'compare';
    
    // Play swap sound
    if (this.soundEnabled) {
      this.soundService.playSwapSound();
    }
    
    // Update complexity meter
    this.currentComplexity.swaps++;
    this.currentComplexity.arrayAccesses += 2;
    
    // Wait for highlight animation (400ms slow motion)
    await this.sleep(400);
    
    // Perform the actual swap
    const tempPosition = block1.position;
    block1.position = block2.position;
    block2.position = tempPosition;
    
    [this.blocks[index1], this.blocks[index2]] = [this.blocks[index2], this.blocks[index1]];
    
    // Trigger update for smooth animation
    this.blocks = [...this.blocks];
    
    // Wait for swap animation (300ms)
    await this.sleep(300);
  }

  provideFeedback(block1: Block, block2: Block, isCorrect: boolean): void {
    if (isCorrect) {
      this.correctMoves++;
      this.showMoveAffirmation('correct');
      this.score += 50;
      
      // Play correct sound
      if (this.soundEnabled) {
        this.soundService.playCorrectSound();
      }
      
      setTimeout(() => {
        block1.state = 'correct';
        block2.state = 'correct';
        setTimeout(() => {
          block1.state = 'normal';
          block2.state = 'normal';
        }, 800);
      }, 100);
    } else {
      this.incorrectMoves++;
      this.showMoveAffirmation('incorrect');
      this.score = Math.max(0, this.score - 10);
      
      // Play incorrect sound
      if (this.soundEnabled) {
        this.soundService.playIncorrectSound();
      }
      
      setTimeout(() => {
        block1.state = 'incorrect';
        block2.state = 'incorrect';
        setTimeout(() => {
          block1.state = 'normal';
          block2.state = 'normal';
        }, 800);
      }, 100);
    }
    
    // Update complexity meter
    this.currentComplexity.comparisons++;
  }

  // Guided Mode: Calculate the next expected move based on algorithm
  calculateNextExpectedMove(): void {
    if (!this.selectedLevel || !this.guidedMode) return;

    switch (this.selectedLevel.algorithm) {
      case 'bubble':
        this.calculateBubbleSortNextMove();
        break;
      case 'selection':
        this.calculateSelectionSortNextMove();
        break;
      case 'insertion':
        this.calculateInsertionSortNextMove();
        break;
      default:
        this.expectedMove = null;
    }

    // Update step description to include current move instruction
    if (this.expectedMove && this.currentStepIndex < this.algorithmSteps.length) {
      this.algorithmSteps[this.currentStepIndex].description = 
        `${this.expectedMove.description}\n\n💡 ${this.expectedMove.reason}`;
    }
  }

  calculateBubbleSortNextMove(): void {
    // Bubble Sort: Compare adjacent elements, swap if left > right
    // Multiple passes, each pass bubbles largest element to end
    const n = this.blocks.length;
    let found = false;

    // Continue from current pass and compare index
    for (let pass = this.currentPass; pass < n - 1 && !found; pass++) {
      const startIdx = (pass === this.currentPass) ? this.currentCompareIndex : 0;
      
      for (let i = startIdx; i < n - 1 - pass && !found; i++) {
        if (this.blocks[i].value > this.blocks[i + 1].value) {
          this.expectedMove = {
            sourceIndex: i,
            targetIndex: i + 1,
            description: `Compare blocks at positions ${i + 1} and ${i + 2}. Since ${this.blocks[i].value} > ${this.blocks[i + 1].value}, swap them!`,
            reason: `In Bubble Sort, we compare neighbors and swap if they're in wrong order. This "bubbles" larger values toward the end.`
          };
          this.currentCompareIndex = i + 1;
          this.currentPass = pass;
          found = true;
        } else {
          this.currentCompareIndex = i + 1;
        }
      }
      
      if (!found) {
        // Pass completed, move to next pass
        this.currentPass = pass + 1;
        this.currentCompareIndex = 0;
      }
    }

    if (!found) {
      this.expectedMove = null; // Sorting complete
    }
  }

  calculateSelectionSortNextMove(): void {
    // Selection Sort: Find minimum in unsorted portion, swap with first unsorted position
    const n = this.blocks.length;
    
    if (this.sortedUntilIndex >= n) {
      this.expectedMove = null;
      return;
    }

    // Find minimum in unsorted portion
    let minIdx = this.sortedUntilIndex;
    for (let i = this.sortedUntilIndex + 1; i < n; i++) {
      if (this.blocks[i].value < this.blocks[minIdx].value) {
        minIdx = i;
      }
    }

    // If minimum is already at the correct position, move to next
    if (minIdx === this.sortedUntilIndex) {
      this.sortedUntilIndex++;
      this.calculateSelectionSortNextMove(); // Recursive call for next position
      return;
    }

    this.expectedMove = {
      sourceIndex: minIdx,
      targetIndex: this.sortedUntilIndex,
      description: `The smallest value in the unsorted section is ${this.blocks[minIdx].value} at position ${minIdx + 1}. Swap it with position ${this.sortedUntilIndex + 1}.`,
      reason: `Selection Sort finds the minimum element and places it at the beginning of the unsorted section, growing the sorted portion by one.`
    };
  }

  calculateInsertionSortNextMove(): void {
    // Insertion Sort: Take next unsorted element, insert it into correct position in sorted portion
    const n = this.blocks.length;
    
    // sortedUntilIndex represents how many elements are sorted [0...sortedUntilIndex)
    if (this.sortedUntilIndex >= n) {
      this.expectedMove = null;
      return;
    }

    // Start from sortedUntilIndex and move left, comparing with previous element
    // We need to insert blocks[sortedUntilIndex] into the sorted portion
    let currentPos = this.sortedUntilIndex;
    
    // Find if current element needs to move left (compare with element to its left)
    while (currentPos > 0 && this.blocks[currentPos].value < this.blocks[currentPos - 1].value) {
      // Found a pair that needs swapping
      this.expectedMove = {
        sourceIndex: currentPos,
        targetIndex: currentPos - 1,
        description: `Move ${this.blocks[currentPos].value} leftward. It should go before ${this.blocks[currentPos - 1].value}.`,
        reason: `Insertion Sort moves each element leftward through the sorted portion until it finds its correct position.`
      };
      return;
    }
    
    // If we get here, the element at sortedUntilIndex is in correct position
    // Move to next unsorted element
    this.sortedUntilIndex++;
    
    // Recursively check next element
    if (this.sortedUntilIndex < n) {
      this.calculateInsertionSortNextMove();
    } else {
      this.expectedMove = null; // All done!
    }
  }

  highlightValidTargets(sourceIndex: number): void {
    // Clear any previous highlights
    this.clearTargetHighlights();

    if (!this.guidedMode || !this.expectedMove) return;

    // Highlight the source block (the one that should be dragged)
    if (this.blocks[this.expectedMove.sourceIndex]) {
      this.blocks[this.expectedMove.sourceIndex].state = 'suggested';
    }

    // Highlight the target position (where it should be dropped)
    if (this.blocks[this.expectedMove.targetIndex]) {
      this.blocks[this.expectedMove.targetIndex].state = 'target';
    }
  }

  clearTargetHighlights(): void {
    // Reset all blocks to normal state (except those with persistent states)
    this.blocks.forEach(block => {
      if (block.state === 'suggested' || block.state === 'target') {
        block.state = 'normal';
      }
    });
  }

  // Algorithm validation - Enhanced to teach proper algorithm steps
  validateMove(block1: Block, block2: Block): boolean {
    if (!this.selectedLevel) return false;
    
    const index1 = this.blocks.findIndex(b => b.id === block1.id);
    const index2 = this.blocks.findIndex(b => b.id === block2.id);
    
    switch (this.selectedLevel.algorithm) {
      case 'bubble':
        // Bubble Sort: Only allow swapping adjacent elements if left > right
        // This teaches: "Compare neighbors, swap if wrong order"
        return Math.abs(index1 - index2) === 1 && block1.value > block2.value;
        
      case 'selection':
        // Selection Sort: Must swap unsorted minimum with current position
        // First, find what should be the sorted boundary
        const sortedCount = this.blocks.filter((b, idx) => {
          const before = this.blocks.slice(0, idx);
          return before.every(prev => prev.value <= b.value);
        }).length;
        
        // Find minimum in unsorted section
        const unsortedBlocks = this.blocks.slice(sortedCount);
        const minValue = Math.min(...unsortedBlocks.map(b => b.value));
        
        // Valid move: selecting minimum from unsorted and swapping to sorted boundary
        return (block1.value === minValue || block2.value === minValue) && 
               (index1 === sortedCount || index2 === sortedCount);
        
      case 'insertion':
        // Insertion Sort: Move element leftward to its correct position
        // Must move element that's out of order, and only move it one step left at a time
        const isMovingLeft = index2 < index1;
        const isAdjacent = Math.abs(index1 - index2) === 1;
        const needsSwap = block1.value < block2.value;
        
        return isMovingLeft && isAdjacent && needsSwap;
        
      case 'quick':
        // Quick Sort: Partition around pivot
        // For simplicity, use rightmost element as pivot
        const pivot = this.blocks[this.blocks.length - 1].value;
        const shouldBeOnLeft = block1.value < pivot && index1 > index2;
        const shouldBeOnRight = block1.value > pivot && index1 < index2;
        
        return shouldBeOnLeft || shouldBeOnRight;
        
      case 'merge':
        // Merge Sort: Merge two sorted halves
        const mid = Math.floor(this.blocks.length / 2);
        const leftSorted = this.blocks.slice(0, mid).every((b, i, arr) => 
          i === 0 || arr[i - 1].value <= b.value
        );
        const rightSorted = this.blocks.slice(mid).every((b, i, arr) => 
          i === 0 || arr[i - 1].value <= b.value
        );
        
        // Valid if merging from sorted halves
        return leftSorted && rightSorted && block1.value > block2.value;
        
      default:
        return Math.abs(index1 - index2) === 1 && block1.value > block2.value;
    }
  }

  showMoveAffirmation(type: 'correct' | 'incorrect' | 'guided'): void {
    if (type === 'correct') {
      const affirmations = [
        '✨ Perfect! Following the algorithm!',
        '🎯 Great move! That\'s exactly right!',
        '⭐ Excellent! You got it!',
        '🔥 Amazing! Keep going!',
        '💯 Correct move!',
        '🚀 Brilliant! That\'s how it works!'
      ];
      this.moveAffirmation = affirmations[Math.floor(Math.random() * affirmations.length)];
    } else if (type === 'guided') {
      this.moveAffirmation = '👉 Follow the highlighted blocks! Check the guide for what to do next.';
    } else {
      const corrections = [
        '💭 Not quite... Check the algorithm guide!',
        '🤔 Try following the current step',
        '📚 Review the algorithm pattern',
        '🎓 Look at what the algorithm does next',
        '💡 Use the hint button for guidance',
        '🧩 Close! But the algorithm works differently'
      ];
      this.moveAffirmation = corrections[Math.floor(Math.random() * corrections.length)];
    }
    
    this.lastMoveCorrect = type === 'correct';
    
    setTimeout(() => {
      this.moveAffirmation = '';
      this.lastMoveCorrect = null;
    }, 3000);
  }

  // Algorithm steps - Enhanced with clearer guidance
  generateAlgorithmSteps(algorithm: string): void {
    switch (algorithm) {
      case 'bubble':
        this.algorithmSteps = [
          { 
            title: '🎯 Action: Compare First Two', 
            description: 'DRAG the bigger block to the right if they\'re out of order',
            example: 'If you see [5, 3], drag 5 to swap with 3 → [3, 5]'
          },
          { 
            title: '👉 Action: Move to Next Pair', 
            description: 'Now compare the next two adjacent blocks to the right',
            example: 'Done with [3, 5]? Now check [5, 2] → swap to [3, 2, 5]'
          },
          { 
            title: '🫧 Result: Largest Bubbles Up', 
            description: 'After one pass, the largest number moves to the end',
            example: 'After comparing all pairs, biggest block is now at the right!'
          },
          { 
            title: '🔄 Action: Start New Pass', 
            description: 'Go back to the beginning and repeat the process',
            example: 'Second pass will place the 2nd largest at the end'
          },
          { 
            title: '⚡ Tip: Skip Sorted Blocks', 
            description: 'Each pass, ignore the last sorted blocks - they\'re done!',
            example: 'If [1, 2, 3, 4], those rightmost blocks are already sorted'
          },
          { 
            title: '✅ Done: No More Swaps', 
            description: 'When a full pass has no swaps, your array is sorted!',
            example: 'If all pairs are in order, you win! 🎉'
          }
        ];
        break;
        
      case 'selection':
        this.algorithmSteps = [
          { 
            title: '🎯 Action: Find Smallest Block', 
            description: 'LOOK at all unsorted blocks and find the one with the smallest number',
            example: 'In [8, 3, 5, 1], scan all blocks → 1 is the smallest!'
          },
          { 
            title: '🔄 Action: Swap to Front', 
            description: 'DRAG that smallest block to the first unsorted position',
            example: 'Drag 1 to the beginning → [1, 3, 5, 8]'
          },
          { 
            title: '✅ Result: First Position Sorted', 
            description: 'The block you just moved is now in its FINAL correct position!',
            example: '[1] is locked in place, never needs to move again'
          },
          { 
            title: '🔁 Action: Find Next Smallest', 
            description: 'Ignore sorted blocks. Find the smallest in remaining unsorted blocks',
            example: 'Sorted: [1] | Unsorted: [8, 5, 3] → Next smallest is 3'
          },
          { 
            title: '📍 Action: Place It Second', 
            description: 'DRAG that block to the second position',
            example: 'Drag 3 → [1, 3, 5, 8] | Now [1, 3] are sorted!'
          },
          { 
            title: '🎉 Continue Until Done', 
            description: 'Keep selecting minimum and placing it. Each block finds its final spot!',
            example: 'Build sorted section: [1] → [1,3] → [1,3,5] → [1,3,5,8] ✨'
          }
        ];
        break;
        
      case 'insertion':
        this.algorithmSteps = [
          { 
            title: '🎯 Action: Pick Second Block', 
            description: 'First block is "sorted". Now PICK the second block to insert',
            example: 'Have [5]. Pick 3 from [5, 3, 8, 1] → Need to insert 3'
          },
          { 
            title: '👈 Action: Compare with Left', 
            description: 'Is your picked block smaller than its left neighbor?',
            example: 'Is 3 < 5? YES! So we need to move 3 left'
          },
          { 
            title: '🔄 Action: Swap Leftward', 
            description: 'DRAG your block one position to the left',
            example: 'Drag 3 left: [5, 3] → [3, 5] ✓'
          },
          { 
            title: '🛑 Stop: Found Correct Spot', 
            description: 'Stop when left neighbor is smaller OR you reach the start',
            example: 'Stop moving when: [2, 3, 5] - 3 is bigger than 2!'
          },
          { 
            title: '➡️ Action: Pick Next Block', 
            description: 'Move to the next unsorted block and repeat the process',
            example: 'Sorted: [1, 3, 5] | Pick next: 2 → Insert it: [1, 2, 3, 5]'
          },
          { 
            title: '🎴 Think: Sorting Playing Cards', 
            description: 'Just like arranging cards! Pick one, slide it into the right spot',
            example: 'Each block slides left until it finds where it belongs 🎉'
          }
        ];
        break;
        
      case 'quick':
        this.algorithmSteps = [
          { 
            title: '🎯 Step 1: Choose Pivot', 
            description: 'Pick the last element as the "pivot"',
            example: '[8, 3, 5, 1, 9] - Pivot = 9'
          },
          { 
            title: '⬅️ Step 2: Partition Left', 
            description: 'Move all elements SMALLER than pivot to the left',
            example: '3 < 9, 5 < 9, 1 < 9, 8 < 9 → all go left'
          },
          { 
            title: '➡️ Step 3: Partition Right', 
            description: 'Move all elements LARGER than pivot to the right',
            example: 'Nothing larger than 9, so right side empty'
          },
          { 
            title: '📍 Step 4: Place Pivot', 
            description: 'Put pivot in its final sorted position',
            example: '[3, 5, 1, 8] | [9] - 9 is now in correct place!'
          },
          { 
            title: '🔁 Step 5: Divide & Conquer', 
            description: 'Recursively apply to left and right sections',
            example: 'Sort [3, 5, 1, 8] and [] separately'
          },
          { 
            title: '✅ Step 6: Combine', 
            description: 'No need to merge! Everything is sorted in place',
            example: 'Final: [1, 3, 5, 8, 9]'
          }
        ];
        break;
        
      case 'merge':
        this.algorithmSteps = [
          { 
            title: '✂️ Step 1: Divide in Half', 
            description: 'Split array into two equal parts',
            example: '[8, 3, 5, 1] → [8, 3] and [5, 1]'
          },
          { 
            title: '🔁 Step 2: Keep Dividing', 
            description: 'Recursively split until you have single elements',
            example: '[8] [3] [5] [1] - Can\'t divide further!'
          },
          { 
            title: '🔄 Step 3: Merge Two Elements', 
            description: 'Compare two elements, put smaller one first',
            example: '[8] + [3] → [3, 8], [5] + [1] → [1, 5]'
          },
          { 
            title: '⬆️ Step 4: Merge Sorted Pairs', 
            description: 'Merge two sorted subarrays into one sorted array',
            example: '[3, 8] + [1, 5]: Compare 3 vs 1 → take 1'
          },
          { 
            title: '👀 Step 5: Two-Pointer Merge', 
            description: 'Keep taking the smaller element from either subarray',
            example: '1, then 3, then 5, then 8 → [1, 3, 5, 8]'
          },
          { 
            title: '✅ Step 6: Done!', 
            description: 'All merges complete = fully sorted array',
            example: 'Each merge step maintains sorted order'
          }
        ];
        break;
        
      default:
        this.algorithmSteps = [
          { title: '1️⃣ Observe', description: 'Look at the blocks', example: 'Find patterns' },
          { title: '2️⃣ Compare', description: 'Check which are out of order', example: 'Identify swaps needed' },
          { title: '3️⃣ Move', description: 'Swap toward correct position', example: 'Make progress' },
          { title: '4️⃣ Repeat', description: 'Keep sorting', example: 'Until all sorted' }
        ];
    }
  }

  updateCurrentStep(): void {
    if (this.algorithmSteps.length === 0) return;
    this.currentStepIndex = this.moves % this.algorithmSteps.length;
    this.currentAlgorithmStep = this.algorithmSteps[this.currentStepIndex];
  }

  // Game completion
  checkCompletion(): void {
    const sorted = this.blocks.every((block, index) => {
      if (index === 0) return true;
      return block.value > this.blocks[index - 1].value;
    });
    
    if (sorted) {
      this.completeGame();
    }
  }

  completeGame(): void {
    this.isGameComplete = true;
    this.showCelebration = true;
    this.showConfetti = true;
    this.confettiItems = ['🎉', '⭐', '🎊', '✨', '🏆', '💫', '🌟', '🎈'];
    
    // Play level complete sound
    if (this.soundEnabled) {
      this.soundService.playLevelCompleteSound();
    }
    
    if (this.timer) {
      clearInterval(this.timer);
    }
    
    this.calculateScore();
    
    if (this.selectedLevel) {
      this.selectedLevel.completed = true;
      if (this.score > this.selectedLevel.bestScore) {
        this.selectedLevel.bestScore = this.score;
      }
      
      this.totalStars += this.stars;
      this.unlockNextLevels();
    }
    
    setTimeout(() => {
      this.showCelebration = false;
      this.showConfetti = false;
    }, 4000);
  }

  calculateScore(): void {
    const baseScore = 1000;
    const timeBonus = Math.max(0, 500 - this.timeElapsed * 3);
    const moveBonus = this.correctMoves * 100 - this.incorrectMoves * 30;
    const accuracyBonus = this.moves > 0 ? Math.floor((this.correctMoves / this.moves) * 300) : 0;
    
    this.score = Math.max(0, baseScore + timeBonus + moveBonus + accuracyBonus);
    
    const multiplier = this.currentSubLevel;
    if (this.score > 1500 * multiplier) this.stars = 3;
    else if (this.score > 1000 * multiplier) this.stars = 2;
    else this.stars = 1;
  }

  toggleAIHelper(): void {
    this.showAIHelper = !this.showAIHelper;
    if (this.showAIHelper) {
      this.getAIHint();
      // On mobile, scroll the AI helper into view
      if (this.isMobile) {
        setTimeout(() => {
          const aiPanel = document.querySelector('.ai-helper-panel');
          if (aiPanel) {
            aiPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 100);
      }
    }
  }

  toggleGuidedMode(): void {
    this.guidedMode = !this.guidedMode;
    
    if (this.guidedMode) {
      // Enable guided mode: calculate first expected move
      this.calculateNextExpectedMove();
      if (this.expectedMove) {
        this.highlightValidTargets(this.expectedMove.sourceIndex);
      }
      // Show algorithm guide automatically
      this.showAlgorithmGuide = true;
      // Show affirmation
      this.moveAffirmation = '🎯 Guided Mode ON - Follow the highlighted blocks!';
      setTimeout(() => {
        this.moveAffirmation = '';
      }, 3000);
    } else {
      // Disable guided mode: clear highlights
      this.clearTargetHighlights();
      this.expectedMove = null;
      this.moveAffirmation = '🎲 Free Play Mode - Drag any blocks you want!';
      setTimeout(() => {
        this.moveAffirmation = '';
      }, 3000);
    }
    
    // Save preference to localStorage
    localStorage.setItem('dsaGame_guidedMode', JSON.stringify(this.guidedMode));
  }

  getAIHint(): void {
    if (this.currentHintIndex >= this.hints.length) {
      this.currentHintIndex = 0;
    }
    this.aiMessage = this.hints[this.currentHintIndex];
    this.currentHintIndex++;
  }

  generateHints(algorithm: string): void {
    switch (algorithm) {
      case 'bubble':
        this.hints = [
          "🎯 Compare adjacent blocks - are they in the right order?",
          "💡 If left > right, swap them! That's Bubble Sort!",
          "🔄 Keep comparing neighbors until everything is sorted.",
          "✨ Bigger bubbles rise to the right!",
          "🎮 Pro tip: Only swap adjacent blocks!"
        ];
        break;
      case 'selection':
        this.hints = [
          "🎯 Find the smallest block in the unsorted part.",
          "💡 Move it to the beginning of unsorted section.",
          "🔄 Now that position is sorted! Find next smallest.",
          "✨ Build sorted section from left to right.",
          "🎮 Always SELECT the minimum!"
        ];
        break;
      case 'insertion':
        this.hints = [
          "🎯 Pick an unsorted block and find where it belongs.",
          "💡 Compare with sorted blocks, moving left.",
          "🔄 Insert when you find the right spot!",
          "✨ Like sorting cards in your hand!",
          "🎮 Work left to right, inserting each block correctly."
        ];
        break;
      default:
        this.hints = [
          "🎯 Look for blocks that are out of order.",
          "💡 Try swapping them to get closer to sorted!",
          "✨ Each correct move brings you closer!"
        ];
    }
  }

  visualizeSolution(): Promise<void> {
    if (this.isVisualizing || !this.selectedLevel) return Promise.resolve();
    
    this.isVisualizing = true;
    this.currentStep = 0;
    this.currentStepExplanation = '';
    this.aiMessage = "🤖 Watch how the algorithm works step by step!";
    
    const blocksCopy = [...this.blocks];
    
    return this.animateSolution(blocksCopy).then(() => {
      this.isVisualizing = false;
      this.currentStepExplanation = '';
      this.aiMessage = "✨ Now try it yourself following those steps!";
    });
  }

  setVisualizationSpeed(speed: number): void {
    this.visualizationSpeed = speed;
  }

  setStepExplanation(step: number, explanation: string): void {
    this.currentStep = step;
    this.currentStepExplanation = explanation;
  }

  async animateSolution(blocks: Block[]): Promise<void> {
    if (!this.selectedLevel) return;
    
    switch (this.selectedLevel.algorithm) {
      case 'bubble':
        await this.bubbleSortAnimation(blocks);
        break;
      case 'selection':
        await this.selectionSortAnimation(blocks);
        break;
      case 'insertion':
        await this.insertionSortAnimation(blocks);
        break;
      default:
        await this.bubbleSortAnimation(blocks);
    }
  }

  async bubbleSortAnimation(blocks: Block[]): Promise<void> {
    const n = blocks.length;
    let stepCounter = 0;
    
    for (let i = 0; i < n - 1; i++) {
      this.setStepExplanation(++stepCounter, `Pass ${i + 1}: Looking for the largest unsorted element to bubble up to position ${n - i}`);
      await this.sleep(this.visualizationSpeed);
      
      for (let j = 0; j < n - i - 1; j++) {
        this.setStepExplanation(++stepCounter, `Comparing ${blocks[j].value} and ${blocks[j + 1].value} - checking if swap is needed`);
        blocks[j].state = 'compare';
        blocks[j + 1].state = 'compare';
        this.blocks = [...blocks];
        await this.sleep(this.visualizationSpeed / 2);
        
        if (blocks[j].value > blocks[j + 1].value) {
          this.setStepExplanation(++stepCounter, `${blocks[j].value} > ${blocks[j + 1].value}, so swapping them!`);
          [blocks[j], blocks[j + 1]] = [blocks[j + 1], blocks[j]];
          blocks[j].state = 'correct';
          blocks[j + 1].state = 'correct';
          this.blocks = [...blocks];
          await this.sleep(this.visualizationSpeed);
        } else {
          this.setStepExplanation(++stepCounter, `${blocks[j].value} ≤ ${blocks[j + 1].value}, already in correct order!`);
          await this.sleep(this.visualizationSpeed / 2);
        }
        
        blocks[j].state = 'normal';
        blocks[j + 1].state = 'normal';
      }
      
      this.setStepExplanation(++stepCounter, `✓ Element ${blocks[n - i - 1].value} is now in its final sorted position!`);
      await this.sleep(this.visualizationSpeed);
    }
    
    this.blocks.forEach(b => b.state = 'normal');
    this.setStepExplanation(++stepCounter, `🎉 Sorting complete! All elements are in ascending order.`);
    await this.sleep(this.visualizationSpeed * 1.5);
  }

  async selectionSortAnimation(blocks: Block[]): Promise<void> {
    const n = blocks.length;
    let stepCounter = 0;
    
    for (let i = 0; i < n - 1; i++) {
      let minIdx = i;
      this.setStepExplanation(++stepCounter, `Starting position ${i + 1}: Finding the smallest element in unsorted portion`);
      blocks[minIdx].state = 'highlight';
      this.blocks = [...blocks];
      await this.sleep(this.visualizationSpeed / 2);
      
      for (let j = i + 1; j < n; j++) {
        this.setStepExplanation(++stepCounter, `Checking ${blocks[j].value} - Current minimum is ${blocks[minIdx].value}`);
        blocks[j].state = 'compare';
        this.blocks = [...blocks];
        await this.sleep(this.visualizationSpeed / 3);
        
        if (blocks[j].value < blocks[minIdx].value) {
          this.setStepExplanation(++stepCounter, `Found new minimum: ${blocks[j].value} < ${blocks[minIdx].value}`);
          blocks[minIdx].state = 'normal';
          minIdx = j;
          blocks[minIdx].state = 'highlight';
          await this.sleep(this.visualizationSpeed / 2);
        } else {
          blocks[j].state = 'normal';
        }
      }
      
      if (minIdx !== i) {
        this.setStepExplanation(++stepCounter, `Swapping minimum ${blocks[minIdx].value} to position ${i + 1}`);
        [blocks[i], blocks[minIdx]] = [blocks[minIdx], blocks[i]];
        blocks[i].state = 'correct';
        this.blocks = [...blocks];
        await this.sleep(this.visualizationSpeed);
      } else {
        this.setStepExplanation(++stepCounter, `${blocks[i].value} is already the minimum - no swap needed!`);
      }
      
      blocks[i].state = 'normal';
      blocks[minIdx].state = 'normal';
      this.setStepExplanation(++stepCounter, `✓ Position ${i + 1} now has correct element: ${blocks[i].value}`);
      await this.sleep(this.visualizationSpeed / 2);
    }
    
    this.blocks.forEach(b => b.state = 'normal');
    this.setStepExplanation(++stepCounter, `🎉 Selection sort complete! Each position has its correct element.`);
    await this.sleep(this.visualizationSpeed * 1.5);
  }

  async insertionSortAnimation(blocks: Block[]): Promise<void> {
    const n = blocks.length;
    let stepCounter = 0;
    
    this.setStepExplanation(++stepCounter, `Starting insertion sort - first element ${blocks[0].value} is already sorted`);
    await this.sleep(this.visualizationSpeed);
    
    for (let i = 1; i < n; i++) {
      const key = blocks[i];
      this.setStepExplanation(++stepCounter, `Selecting ${key.value} to insert into sorted portion [0...${i-1}]`);
      key.state = 'highlight';
      this.blocks = [...blocks];
      await this.sleep(this.visualizationSpeed);
      
      let j = i - 1;
      let shiftsCount = 0;
      
      while (j >= 0 && blocks[j].value > key.value) {
        this.setStepExplanation(++stepCounter, `${blocks[j].value} > ${key.value}, shifting ${blocks[j].value} one position right`);
        blocks[j].state = 'compare';
        this.blocks = [...blocks];
        await this.sleep(this.visualizationSpeed / 2);
        
        blocks[j + 1] = blocks[j];
        blocks[j].state = 'normal';
        shiftsCount++;
        j--;
      }
      
      blocks[j + 1] = key;
      blocks[j + 1].state = 'correct';
      this.blocks = [...blocks];
      
      if (shiftsCount > 0) {
        this.setStepExplanation(++stepCounter, `Inserted ${key.value} at position ${j + 2} after shifting ${shiftsCount} element(s)`);
      } else {
        this.setStepExplanation(++stepCounter, `${key.value} is already in correct position - no shifts needed!`);
      }
      
      await this.sleep(this.visualizationSpeed);
      blocks[j + 1].state = 'normal';
      
      this.setStepExplanation(++stepCounter, `✓ First ${i + 1} elements are now sorted`);
      await this.sleep(this.visualizationSpeed / 2);
    }
    
    this.blocks.forEach(b => b.state = 'normal');
    this.setStepExplanation(++stepCounter, `🎉 Insertion sort complete! All elements inserted in correct order.`);
    await this.sleep(this.visualizationSpeed * 1.5);
  }

  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  shuffleArray(array: any[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  getBlockColor(value: number, maxValue: number): string {
    const hue = (value / maxValue) * 270;
    return `hsl(${hue}, 75%, 65%)`;
  }

  getBlockGradient(block: Block): string {
    const baseColor = block.color;
    const rgb = this.hexToRgb(baseColor);
    if (block.state === 'correct') {
      return `linear-gradient(135deg, ${baseColor} 0%, #4CAF50 100%)`;
    } else if (block.state === 'highlight') {
      return `linear-gradient(135deg, ${baseColor} 0%, #FFD700 100%)`;
    }
    return `linear-gradient(135deg, ${baseColor} 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7) 100%)`;
  }

  hexToRgb(hex: string): { r: number; g: number; b: number } {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return { r, g, b };
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  restartLevel(): void {
    if (this.selectedLevel) {
      this.initializeGame(this.selectedLevel);
      this.startTimer();
    }
  }

  getAccuracy(): number {
    if (this.moves === 0) return 100;
    return Math.round((this.correctMoves / this.moves) * 100);
  }

  getDifficultyLabel(subLevel: number): string {
    return ['Easy', 'Medium', 'Hard'][subLevel - 1];
  }

  // Sound effects toggle
  toggleSound(): void {
    this.soundEnabled = !this.soundEnabled;
    this.soundService.setEnabled(this.soundEnabled);
    localStorage.setItem('dsaGame_soundEnabled', String(this.soundEnabled));
    if (this.soundEnabled) {
      this.soundService.playClickSound();
    }
  }

  // Code visualization toggle
  toggleCodeVisualization(): void {
    this.showCodeVisualization = !this.showCodeVisualization;
    localStorage.setItem('dsaGame_showCodeVisualization', String(this.showCodeVisualization));
    if (this.showCodeVisualization && this.selectedLevel) {
      this.initializeAlgorithmCode(this.selectedLevel.algorithm);
    }
  }

  // Block count settings methods
  initializeBlockCountOptions(): void {
    // Generate block count options based on screen size
    if (this.isMobile) {
      this.blockCountOptions = [3, 4, 5, 6];
    } else {
      this.blockCountOptions = [4, 6, 8, 10, 12];
    }
  }

  updateBlockCountForScreen(): void {
    // Auto-adapt block count based on screen width
    const screenWidth = window.innerWidth;
    
    if (screenWidth < 480) {
      // Small mobile
      this.customBlockCount = 4;
      this.blockCountOptions = [3, 4, 5, 6];
    } else if (screenWidth < 768) {
      // Large mobile/small tablet
      this.customBlockCount = 5;
      this.blockCountOptions = [4, 5, 6, 7];
    } else if (screenWidth < 1024) {
      // Tablet
      this.customBlockCount = 6;
      this.blockCountOptions = [5, 6, 7, 8];
    } else if (screenWidth < 1440) {
      // Small desktop
      this.customBlockCount = 8;
      this.blockCountOptions = [6, 8, 10, 12];
    } else {
      // Large desktop
      this.customBlockCount = 10;
      this.blockCountOptions = [8, 10, 12, 14];
    }
  }

  setBlockCount(count: number): void {
    this.customBlockCount = count;
    this.autoAdaptBlockCount = false;
    localStorage.setItem('dsaGame_customBlockCount', String(count));
    localStorage.setItem('dsaGame_autoAdaptBlockCount', 'false');
  }

  toggleAutoAdapt(): void {
    localStorage.setItem('dsaGame_autoAdaptBlockCount', String(this.autoAdaptBlockCount));
    if (this.autoAdaptBlockCount) {
      this.updateBlockCountForScreen();
    }
  }

  applyBlockCount(): void {
    if (this.selectedLevel) {
      this.showSettings = false;
      this.initializeGame(this.selectedLevel);
      this.startTimer();
    }
  }

  // Complexity meter toggle
  toggleComplexityMeter(): void {
    this.showComplexityMeter = !this.showComplexityMeter;
    localStorage.setItem('dsaGame_showComplexityMeter', String(this.showComplexityMeter));
  }

  // Initialize algorithm code for visualization
  initializeAlgorithmCode(algorithm: string): void {
    switch (algorithm) {
      case 'bubble':
        this.algorithmCode = [
          'function bubbleSort(arr) {',
          '  for (let i = 0; i < arr.length; i++) {',
          '    for (let j = 0; j < arr.length - i - 1; j++) {',
          '      if (arr[j] > arr[j + 1]) {',
          '        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];',
          '      }',
          '    }',
          '  }',
          '}'
        ];
        break;
      case 'selection':
        this.algorithmCode = [
          'function selectionSort(arr) {',
          '  for (let i = 0; i < arr.length; i++) {',
          '    let minIdx = i;',
          '    for (let j = i + 1; j < arr.length; j++) {',
          '      if (arr[j] < arr[minIdx]) {',
          '        minIdx = j;',
          '      }',
          '    }',
          '    [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];',
          '  }',
          '}'
        ];
        break;
      case 'insertion':
        this.algorithmCode = [
          'function insertionSort(arr) {',
          '  for (let i = 1; i < arr.length; i++) {',
          '    let key = arr[i];',
          '    let j = i - 1;',
          '    while (j >= 0 && arr[j] > key) {',
          '      arr[j + 1] = arr[j];',
          '      j--;',
          '    }',
          '    arr[j + 1] = key;',
          '  }',
          '}'
        ];
        break;
      case 'merge':
        this.algorithmCode = [
          'function mergeSort(arr) {',
          '  if (arr.length <= 1) return arr;',
          '  const mid = Math.floor(arr.length / 2);',
          '  const left = mergeSort(arr.slice(0, mid));',
          '  const right = mergeSort(arr.slice(mid));',
          '  return merge(left, right);',
          '}',
          'function merge(left, right) {',
          '  let result = [], i = 0, j = 0;',
          '  while (i < left.length && j < right.length) {',
          '    result.push(left[i] < right[j] ? left[i++] : right[j++]);',
          '  }',
          '  return result.concat(left.slice(i)).concat(right.slice(j));',
          '}'
        ];
        break;
      case 'quick':
        this.algorithmCode = [
          'function quickSort(arr, low = 0, high = arr.length - 1) {',
          '  if (low < high) {',
          '    const pivot = partition(arr, low, high);',
          '    quickSort(arr, low, pivot - 1);',
          '    quickSort(arr, pivot + 1, high);',
          '  }',
          '}',
          'function partition(arr, low, high) {',
          '  const pivot = arr[high];',
          '  let i = low - 1;',
          '  for (let j = low; j < high; j++) {',
          '    if (arr[j] < pivot) {',
          '      i++;',
          '      [arr[i], arr[j]] = [arr[j], arr[i]];',
          '    }',
          '  }',
          '  [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];',
          '  return i + 1;',
          '}'
        ];
        break;
      default:
        this.algorithmCode = ['// Algorithm code not available'];
    }
    this.currentCodeLine = -1;
  }

  // Update current code line based on algorithm step
  updateCodeLine(): void {
    if (!this.showCodeVisualization || !this.selectedLevel) return;
    
    const algorithm = this.selectedLevel.algorithm;
    const pass = this.currentPass;
    const compareIndex = this.currentCompareIndex;
    
    // Map algorithm state to code line
    switch (algorithm) {
      case 'bubble':
        if (compareIndex >= 0) {
          this.currentCodeLine = 3; // Comparison line
        }
        break;
      case 'selection':
        if (compareIndex >= 0) {
          this.currentCodeLine = 4; // Finding minimum
        }
        break;
      case 'insertion':
        if (compareIndex >= 0) {
          this.currentCodeLine = 5; // While loop comparison
        }
        break;
    }
  }

  // Reset complexity meter
  resetComplexityMeter(): void {
    this.currentComplexity = {
      comparisons: 0,
      swaps: 0,
      arrayAccesses: 0
    };
  }

  // Get theoretical complexity for display
  getTheoreticalComplexity(): string {
    if (!this.selectedLevel) return '';
    
    const n = this.blocks.length;
    const algorithm = this.selectedLevel.algorithm;
    
    switch (algorithm) {
      case 'bubble':
      case 'selection':
      case 'insertion':
        return `O(n²) = O(${n}²) = ${n * n} operations (worst case)`;
      case 'merge':
      case 'quick':
        const nLogN = Math.round(n * Math.log2(n));
        return `O(n log n) = O(${n} log ${n}) ≈ ${nLogN} operations (average case)`;
      default:
        return '';
    }
  }

  // ========== COMPLEXITY QUIZ GAME METHODS ==========

  startComplexityQuiz(): void {
    this.complexityQuizMode = true;
    this.complexityQuizScore = 0;
    this.currentComplexityQuestion = 0;
    this.complexityQuizTotal = this.complexityQuestions.length;
    this.shuffleComplexityQuestions();
    this.loadNextComplexityQuestion();
  }

  shuffleComplexityQuestions(): void {
    for (let i = this.complexityQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.complexityQuestions[i], this.complexityQuestions[j]] = 
        [this.complexityQuestions[j], this.complexityQuestions[i]];
    }
  }

  loadNextComplexityQuestion(): void {
    if (this.currentComplexityQuestion < this.complexityQuestions.length) {
      this.showComplexityFeedback = false;
      this.complexityFeedbackMessage = '';
      this.complexityBlockPlaced = false;
      this.placedInComplexityZone = null;
      this.dragOverComplexityZone = null;
      this.correctComplexityZone = null;
      this.incorrectComplexityZone = null;
      
      // Reset RAF state
      if (this.complexityRafId) {
        cancelAnimationFrame(this.complexityRafId);
        this.complexityRafId = null;
      }
      this.complexityLastZoneCheck = 0;
    } else {
      this.showComplexityQuizResults();
    }
  }

  getCurrentComplexityQuestion() {
    return this.complexityQuestions[this.currentComplexityQuestion];
  }

  // Desktop drag handlers for complexity quiz
  onComplexityDragStart(event: DragEvent): void {
    event.dataTransfer!.effectAllowed = 'move';
  }

  onComplexityDragOver(event: DragEvent, zoneType: string): void {
    event.preventDefault();
    this.dragOverComplexityZone = zoneType;
  }

  onComplexityDragLeave(event: DragEvent): void {
    this.dragOverComplexityZone = null;
  }

  onComplexityDrop(event: DragEvent, zoneType: string): void {
    event.preventDefault();
    this.dragOverComplexityZone = null;
    this.complexityBlockPlaced = true;
    this.placedInComplexityZone = zoneType;
    
    setTimeout(() => {
      this.checkComplexityAnswer(zoneType);
      this.visualizeComplexityPlacement(zoneType);
    }, 200);
  }

  // Mobile touch handlers for complexity quiz
  onComplexityTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    this.complexityTouchStartX = touch.clientX;
    this.complexityTouchStartY = touch.clientY;
    
    this.complexityDraggedElement = event.currentTarget as HTMLElement;
    this.complexityDraggedElement.classList.add('dragging');
  }

  onComplexityTouchMove(event: TouchEvent): void {
    if (!this.complexityDraggedElement) return;
    
    event.preventDefault();
    const touch = event.touches[0];
    this.complexityCurrentTouchX = touch.clientX;
    this.complexityCurrentTouchY = touch.clientY;
    
    // Use RAF for smooth movement
    if (!this.complexityRafId) {
      this.complexityRafId = requestAnimationFrame(() => this.updateComplexityDragPosition());
    }
    
    // Throttle zone checking to every 150ms
    const now = Date.now();
    if (now - this.complexityLastZoneCheck > 150) {
      this.checkComplexityDropZone(this.complexityCurrentTouchX, this.complexityCurrentTouchY);
      this.complexityLastZoneCheck = now;
    }
  }

  private updateComplexityDragPosition(): void {
    if (this.complexityDraggedElement) {
      const deltaX = this.complexityCurrentTouchX - this.complexityTouchStartX;
      const deltaY = this.complexityCurrentTouchY - this.complexityTouchStartY;
      this.complexityDraggedElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    }
    this.complexityRafId = null;
  }

  private checkComplexityDropZone(x: number, y: number): void {
    const elementBelow = document.elementFromPoint(x, y);
    if (elementBelow) {
      const zone = elementBelow.closest('.complexity-drop-zone');
      const newZoneType = zone ? zone.getAttribute('data-complexity') : null;
      if (newZoneType !== this.dragOverComplexityZone) {
        this.dragOverComplexityZone = newZoneType;
      }
    }
  }

  onComplexityTouchEnd(event: TouchEvent): void {
    if (!this.complexityDraggedElement) return;
    
    // Cancel any pending RAF
    if (this.complexityRafId) {
      cancelAnimationFrame(this.complexityRafId);
      this.complexityRafId = null;
    }
    
    const touch = event.changedTouches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // Reset dragged element
    this.complexityDraggedElement.style.transform = '';
    this.complexityDraggedElement.classList.remove('dragging');
    
    if (elementBelow) {
      const zone = elementBelow.closest('.complexity-drop-zone');
      if (zone) {
        const zoneType = zone.getAttribute('data-complexity') as string;
        this.complexityBlockPlaced = true;
        this.placedInComplexityZone = zoneType;
        
        setTimeout(() => {
          this.checkComplexityAnswer(zoneType);
          this.visualizeComplexityPlacement(zoneType);
        }, 200);
      }
    }
    
    this.dragOverComplexityZone = null;
    this.complexityDraggedElement = null;
  }

  checkComplexityAnswer(selectedComplexity: string): void {
    const currentQuestion = this.getCurrentComplexityQuestion();
    this.isComplexityCorrect = selectedComplexity === currentQuestion.correctComplexity;
    
    if (this.isComplexityCorrect) {
      this.complexityQuizScore++;
      this.complexityFeedbackMessage = `✅ Correct! ${currentQuestion.explanation}`;
      if (this.soundEnabled) {
        this.soundService.playCorrectSound();
      }
    } else {
      this.complexityFeedbackMessage = `❌ Not quite! This is ${currentQuestion.correctComplexity}. ${currentQuestion.explanation}`;
      if (this.soundEnabled) {
        this.soundService.playIncorrectSound();
      }
    }
    
    this.showComplexityFeedback = true;
  }

  visualizeComplexityPlacement(zoneType: string): void {
    const currentQuestion = this.getCurrentComplexityQuestion();
    if (this.isComplexityCorrect) {
      this.correctComplexityZone = zoneType;
      setTimeout(() => {
        this.correctComplexityZone = null;
      }, 2000);
    } else {
      this.incorrectComplexityZone = zoneType;
      // Also highlight the correct zone
      setTimeout(() => {
        this.correctComplexityZone = currentQuestion.correctComplexity;
      }, 500);
      setTimeout(() => {
        this.incorrectComplexityZone = null;
        this.correctComplexityZone = null;
      }, 2500);
    }
  }

  nextComplexityQuestion(): void {
    this.currentComplexityQuestion++;
    this.loadNextComplexityQuestion();
  }

  showComplexityQuizResults(): void {
    const percentage = Math.round((this.complexityQuizScore / this.complexityQuizTotal) * 100);
    let message = '';
    
    if (percentage === 100) {
      message = '🏆 Perfect! You\'re a Big O Master!';
    } else if (percentage >= 80) {
      message = '🌟 Excellent! You understand complexity well!';
    } else if (percentage >= 60) {
      message = '👍 Good job! Keep practicing!';
    } else {
      message = '📚 Keep learning! Review the concepts and try again!';
    }
    
    this.complexityFeedbackMessage = `${message}\n\nScore: ${this.complexityQuizScore}/${this.complexityQuizTotal} (${percentage}%)`;
    this.showComplexityFeedback = true;
  }

  restartComplexityQuiz(): void {
    this.startComplexityQuiz();
  }

  exitComplexityQuiz(): void {
    this.complexityQuizMode = false;
    this.currentView = 'menu';
    
    // Cleanup RAF
    if (this.complexityRafId) {
      cancelAnimationFrame(this.complexityRafId);
      this.complexityRafId = null;
    }
  }
}
