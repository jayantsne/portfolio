import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { trigger, transition, style, animate, state } from '@angular/animations';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { INTERVIEW_QUESTIONS } from '../interview-questions-data'; // Fallback for offline mode
import { AILearnService } from '../../services/ai-learn.service';
import { AiStreamingService, OllamaModel } from '../../services/ai-streaming.service';
import { InterviewQuestionsService, QuestionPromptsResponse, QuestionPrompt } from '../../services/interview-questions.service';
import { NotesService, SavedNote } from '../../shared/notes.service';
import { CustomAuthService } from '../../shared/custom-auth.service';

// ── Visual Flow Animation types ───────────────────────────────────────────────
interface FlowStep {
  icon: string;
  title: string;
  description: string;
  connectorLabel?: string;
}
interface FlowDiagram {
  title: string;
  subtitle?: string;
  steps: FlowStep[];
}

@Component({
  selector: 'app-questions-list',
  templateUrl: './questions-list.component.html',
  styleUrls: ['./questions-list.component.css', '../ai-qa.component.css'],
  animations: [
    trigger('cardAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.3s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('expandAnswer', [
      transition(':enter', [
        style({ opacity: 0, maxHeight: 0, overflow: 'hidden' }),
        animate('0.4s ease-out', style({ opacity: 1, maxHeight: '1000px' }))
      ]),
      transition(':leave', [
        animate('0.3s ease-in', style({ opacity: 0, maxHeight: 0 }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('0.3s ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('0.2s ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('expandCollapse', [
      transition(':enter', [
        style({ opacity: 0, height: 0, overflow: 'hidden' }),
        animate('0.3s ease-out', style({ opacity: 1, height: '*' }))
      ]),
      transition(':leave', [
        animate('0.2s ease-in', style({ opacity: 0, height: 0 }))
      ])
    ]),
    trigger('slideDown', [
      transition(':enter', [
        style({ transform: 'translateY(-10px)', opacity: 0 }),
        animate('0.2s ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ])
    ]),
    trigger('slideUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(50px) scale(0.9)' }),
        animate('0.4s cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ]),
      transition(':leave', [
        animate('0.3s ease-in', style({ opacity: 0, transform: 'translateY(50px) scale(0.9)' }))
      ])
    ]),
    trigger('slideUpBounce', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(100px) scale(0.8)' }),
        animate('0.5s cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ]),
      transition(':leave', [
        animate('0.3s ease-in', style({ opacity: 0, transform: 'translateY(100px) scale(0.8)' }))
      ])
    ]),
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('0.4s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('slideAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(50px)' }),
        animate('0.3s ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('bounceIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0)' }),
        animate('0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55)', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ]),
    trigger('staggerList', [
      transition(':enter', [
        style({ opacity: 0 })
      ])
    ]),
    trigger('fadeInRight', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-30px)' }),
        animate('0.3s ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('pulse', [
      state('liked', style({ transform: 'scale(1)' })),
      state('unliked', style({ transform: 'scale(1)' })),
      transition('unliked => liked', [
        animate('0.3s ease-out', style({ transform: 'scale(1.2)' })),
        animate('0.2s ease-in', style({ transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class QuestionsListComponent implements OnInit, OnDestroy {
  interviewQuestions: any[] = [];
  selectedCategory: string = 'all';
  searchTerm: string = '';
  // Search suggestions
  searchSuggestions: { question: string; category: string; id: number }[] = [];
  showSuggestions = false;
  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  // Streaming AI state
  selectedModel: OllamaModel = 'qwen';  // 'qwen' = fast tech, 'llama' = tutor style
  isStreaming = false;
  streamingText = '';
  private streamSub?: Subscription;
  currentPage: number = 1;
  questionsPerPage: number = 10;
  isMobile: boolean = false;
  isLoadingQuestions: boolean = false;//  Loading state for API
  apiError: string | null = null;  // API error message
  
  // Modal state
  showModal = false;
  modalQuestion = '';
  modalAnswer = '';
  modalCategory = '';
  expandedQuestionId: number | null = null;
  showAlternativeExplanation = false;
  alternativeAIExplanation = '';
  isLoadingAlternative = false;
  currentQuestionForAlternative: any = null;
  
  // AI Explanation state
  aiExplanation = '';
  isLoadingAIExplanation = false;
  aiExplanationError = false;
  showAIExplanation = false;
  currentAnswerRating: number = 0;
  currentQuestionId: string = '';
  answerIsFromDB: boolean = false;
  answerRatingCount: number = 0;
  showRatingSection: boolean = false;
  userLikedAnswer: boolean = false; // Simple like/dislike
  currentAIProvider: string = 'gemini'; // Track which AI provider was used
  alternativeAnswerSaved: boolean = false; // Track if alternative answer is saved
  currentAlternativeProvider: string = ''; // Track which provider was used for alternative explanation
  alternativeAnswerLiked: boolean = false; // Like state for alternative answer
  alternativeContentSafe: SafeHtml = ''; // Sanitized HTML content ready for display
  regenerationCount: number = 0; // Track how many times user regenerated for variety
  
  // NEW: Prompt-based Learning state
  showPromptModal: boolean = false;
  promptData: QuestionPromptsResponse | null = null;
  isGeneratingAIResponse: boolean = false;
  generatedAIResponse: string | null = null;
  currentSelectedPrompt: QuestionPrompt | null = null;
  
  // Animated Diagram state
  showAnimatedDiagram: boolean = false;
  isLoadingDiagram: boolean = false;
  diagramContent: SafeHtml = '';
  diagramData: any = null;
  
  // Slideshow state
  slideshowMode = false;
  currentSlide = 0;
  totalSlides = 0;
  slides: any[] = [];
  
  // API Usage Stats
  apiStats: any = null;
  showApiStatsDetails = false;

  categories: string[] = [
    'Angular', '.NET', '.NET Core', 'SQL', 'DSA', 'OOPs',
    'Design Patterns', 'C#', 'JavaScript', 'TypeScript', 'Fresher CS Fundamentals'
  ];

  // Split-screen "Learn with AI" state (desktop)
  showSplitScreen = false;
  splitQuestion: any = null;
  splitStreamingText = '';
  splitAiExplanation = '';
  splitIsStreaming = false;
  private splitStreamSub?: Subscription;
  splitFollowUpQuestion = '';
  splitFollowUpHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  splitCurrentTopicName = '';
  splitAiError = false;
  splitIsSavingNote = false;
  splitNoteSaved = false;
  private splitNoteSavedTimer: any;
  splitDuplicateDialogMode: 'exact' | 'similar' | null = null;
  splitDuplicateMatchedNote: SavedNote | null = null;
  private splitPendingSaveContent = '';

  // Visual Flow Animation state
  splitFlowMode = false;
  splitIsFlowConcept = false;
  splitFlowDiagram: FlowDiagram | null = null;
  splitIsLoadingFlow = false;
  splitFlowError = false;

  private readonly flowKeywords = [
    'lifecycle', 'life cycle', 'life-cycle', 'how does', 'how it works',
    'how does it work', 'what happens when', 'when you', 'when a',
    'steps', 'stages', 'phases', 'flow', 'pipeline', 'process', 'cycle',
    'sequence', 'request', 'response', 'authentication', 'authorization',
    'login flow', 'routing', 'navigation', 'change detection', 'interceptor',
    'middleware', 'rendering', 'bootstrapping', 'bootstrap', 'startup',
    'event loop', 'http request', 'dependency injection', 'compilation',
    'data flow', 'component communication', 'digest', 'zone.js',
    'order of', 'interaction', 'aot', 'jit', 'handshake',
    'client-server', 'workflow', 'observable pipeline', 'three-way',
  ];

  constructor(
    private aiLearnService: AILearnService,
    private aiStreamingService: AiStreamingService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private interviewQuestionsService: InterviewQuestionsService,
    private notesService: NotesService,
    public customAuth: CustomAuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadInterviewQuestions();
    this.checkMobile();
    this.loadApiStats();
    window.addEventListener('resize', () => this.checkMobile());

    // Debounced search suggestions
    this.searchSub = this.searchSubject.pipe(
      debounceTime(250),
      distinctUntilChanged()
    ).subscribe(term => this.updateSuggestions(term));
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.streamSub?.unsubscribe();
    this.splitStreamSub?.unsubscribe();
    if (this.splitNoteSavedTimer) clearTimeout(this.splitNoteSavedTimer);
  }

  loadInterviewQuestions(): void {
    // Load questions from MongoDB API
    console.log('📡 Loading questions from API...');
    this.isLoadingQuestions = true;
    this.apiError = null;
    
    this.interviewQuestionsService.getAllQuestions().subscribe({
      next: (response) => {
        console.log('✅ Loaded questions from MongoDB:', response.total, 'questions');
        this.interviewQuestions = response.questions.map(q => ({
          ...q,
          timestamp: new Date(),
          saved: false,
          expanded: false,
          isLearning: false
        }));
        this.isLoadingQuestions = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Failed to load questions from API:', error);
        this.apiError = 'Failed to load questions from server';
        this.isLoadingQuestions = false;
        
        // Fallback to static data on error
        console.log('📋 Using fallback static questions data');
        this.interviewQuestions = INTERVIEW_QUESTIONS.map(q => ({
          ...q,
          timestamp: new Date(),
          saved: false,
          expanded: false,
          isLearning: false
        }));
        this.cdr.detectChanges();
      }
    });
  }

  get filteredInterviewQuestions(): any[] {
    return this.interviewQuestions.filter(q => {
      const matchesCategory = this.selectedCategory === 'all' || q.category === this.selectedCategory;
      const matchesSearch = !this.searchTerm || 
        q.question.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        q.answer.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }

  get paginatedQuestions(): any[] {
    if (this.isMobile) return this.filteredInterviewQuestions;
    const startIndex = (this.currentPage - 1) * this.questionsPerPage;
    const endIndex = startIndex + this.questionsPerPage;
    return this.filteredInterviewQuestions.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredInterviewQuestions.length / this.questionsPerPage);
  }

  checkMobile(): void {
    this.isMobile = window.innerWidth <= 768;
  }

  // ─── Search Suggestions ──────────────────────────────────────────────────

  /** Called by (input) event on the search box */
  onSearchInput(value: string): void {
    this.searchSubject.next(value);
    if (!value.trim()) {
      this.showSuggestions = false;
      this.searchSuggestions = [];
    } else {
      this.showSuggestions = true;
    }
  }

  /** Build suggestions list (called after debounce) */
  private updateSuggestions(term: string): void {
    if (!term.trim()) {
      this.searchSuggestions = [];
      this.showSuggestions = false;
      return;
    }
    const lower = term.toLowerCase();
    this.searchSuggestions = this.interviewQuestions
      .filter(q =>
        q.question.toLowerCase().includes(lower) ||
        q.category.toLowerCase().includes(lower)
      )
      .slice(0, 8)
      .map(q => ({ question: q.question, category: q.category, id: q.id }));
    this.showSuggestions = this.searchSuggestions.length > 0;
    this.cdr.detectChanges();
  }

  /** Pick a suggestion — fills the search box */
  selectSuggestion(suggestion: { question: string; category: string; id: number }): void {
    this.searchTerm = suggestion.question;
    this.showSuggestions = false;
    this.searchSuggestions = [];
    this.currentPage = 1;
  }

  hideSuggestions(): void {
    // Delay so click on suggestion registers first
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }

  // ─── Model Selection ─────────────────────────────────────────────────────

  /** Toggle between qwen (fast/tech) and llama (tutor-style) */
  setModel(model: OllamaModel): void {
    this.selectedModel = model;
    console.log(`🤖 Model switched to: ${model === 'qwen' ? 'qwen2.5:3b (fast tech)' : 'llama3.2:3b (tutor style)'}`);
  }

  // ─── Streaming AI ────────────────────────────────────────────────────────

  /**
   * Stream an AI explanation directly into the modal, token by token.
   * Falls back to non-streaming if the model is the 'qwen' default.
   */
  streamAIExplanation(question: any): void {
    // Cancel any ongoing stream
    this.streamSub?.unsubscribe();
    this.isStreaming = true;
    this.streamingText = '';
    this.modalAnswer = '';
    this.aiExplanationError = false;
    this.currentAIProvider = this.selectedModel === 'llama' ? 'llama3.2:3b' : 'qwen2.5:3b';

    this.streamSub = this.aiStreamingService
      .streamExplanation(question.question, this.selectedModel)
      .subscribe({
        next: chunk => {
          if (chunk.error) {
            this.isStreaming = false;
            this.aiExplanationError = true;
            this.modalAnswer = `<div class="ai-error-fallback"><h3>⚠️ AI Error</h3><p>${chunk.error}</p></div>`;
            this.cdr.detectChanges();
            return;
          }
          if (!chunk.done) {
            this.streamingText += chunk.token;
            // Lightweight live display — plain text with streaming cursor
            this.modalAnswer = this.streamingText;
            this.cdr.detectChanges();
          }
        },
        error: err => {
          console.error('Streaming error:', err);
          this.isStreaming = false;
          this.aiExplanationError = true;
          this.modalAnswer = `<div class="ai-error-fallback"><h3>⚠️ Streaming Failed</h3>
            <p>Could not stream AI response. Trying standard mode...</p></div>`;
          // Fallback to non-streaming
          this.getAIExplanationLegacy(question);
          this.cdr.detectChanges();
        },
        complete: () => {
          this.isStreaming = false;
          // Strip leading title duplicate then convert to formatted HTML
          const cleanedStream = this.stripLeadingTitle(this.streamingText, question.question);
          this.modalAnswer = this.cleanMarkdownCodeFences(cleanedStream);
          this.aiExplanation = this.modalAnswer;
          this.cdr.detectChanges();
          console.log(`✅ Stream complete: ${this.streamingText.length} chars`);
        }
      });
  }

  /** Original non-streaming path — kept as fallback */
  getAIExplanationLegacy(question: any): void {
    this.isLoadingAIExplanation = true;
    this.aiLearnService.explainTopicInDetail(question.question, question.category, question.answer, this.currentQuestionId)
      .subscribe({
        next: response => {
          this.isLoadingAIExplanation = false;
          if (response.success) {
            const stripped = this.stripLeadingTitle(response.explanation, question.question);
            this.aiExplanation = stripped;
            this.modalAnswer = stripped;
            this.currentAIProvider = response.provider || 'ollama';
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoadingAIExplanation = false;
          this.aiExplanationError = true;
          this.cdr.detectChanges();
        }
      });
  }

  loadApiStats(): void {
    this.apiStats = this.aiLearnService.getApiStats();
  }
  
  toggleApiStatsDetails(): void {
    this.showApiStatsDetails = !this.showApiStatsDetails;
  }
  
  // Helper for template binding
  parseFloat(value: string): number {
    return parseFloat(value);
  }

  learnQuestion(question: any): void {
    console.log('🎓 Learn with AI clicked for question:', question.id);

    if (!this.isMobile) {
      // Desktop: open split-screen mentor panel
      this.openSplitScreen(question);
      return;
    }

    // Mobile: fallback to mobile bottom-sheet with streaming
    this.showPromptModal = true;
    this.generatedAIResponse = null;
    this.currentSelectedPrompt = null;
    
    this.interviewQuestionsService.getQuestionPrompts(question.id).subscribe({
      next: (response) => {
        console.log('✅ Prompts fetched:', response.prompts.length, 'options');
        this.promptData = response;
      },
      error: (error) => {
        console.error('❌ Failed to fetch prompts:', error);
        this.showPromptModal = false;
        this.expandedQuestionId = question.id;
        this.showAlternativeExplanation = false;
        this.currentQuestionForAlternative = question;
        this.getAIExplanation(question);
      }
    });
  }
  
  // Handle prompt selection from modal
  onPromptSelected(prompt: QuestionPrompt): void {
    if (!this.promptData) return;
    
    console.log('🎯 Prompt selected:', prompt.title);
    this.currentSelectedPrompt = prompt;
    this.isGeneratingAIResponse = true;
    this.generatedAIResponse = null;
    
    // Get the prompt details from API
    this.interviewQuestionsService.getAIPromptDetails(this.promptData.questionId, prompt.id).subscribe({
      next: (response) => {
        console.log('📝 Prompt details received');
        
        // Now use the prompt to generate AI response
        const fullPrompt = response.response; // systemPrompt + userPromptTemplate
        
        this.aiLearnService.getSimplifiedExplanation(fullPrompt).subscribe({
          next: (aiResponse) => {
            this.isGeneratingAIResponse = false;
            if (aiResponse.success && aiResponse.explanation) {
              console.log('✅ AI response generated successfully');
              this.generatedAIResponse = this.cleanMarkdownCodeFences(aiResponse.explanation);
            } else {
              console.error('❌ AI response failed:', aiResponse.error);
              this.generatedAIResponse = '<div class="error-message">Failed to generate explanation. Please try again.</div>';
            }
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('❌ AI generation error:', err);
            this.isGeneratingAIResponse = false;
            this.generatedAIResponse = '<div class="error-message">Error connecting to AI service. Please try again.</div>';
            this.cdr.detectChanges();
          }
        });
      },
      error: (error) => {
        console.error('❌ Failed to get prompt details:', error);
        this.isGeneratingAIResponse = false;
        this.generatedAIResponse = '<div class="error-message">Failed to load prompt. Please try again.</div>';
        this.cdr.detectChanges();
      }
    });
  }
  
  // Close prompt modal
  onClosePromptModal(): void {
    this.showPromptModal = false;
    this.promptData = null;
    this.generatedAIResponse = null;
    this.currentSelectedPrompt = null;
    this.isGeneratingAIResponse = false;
  }
  
  // Start new prompt selection
  onStartNewPrompt(): void {
    this.generatedAIResponse = null;
    this.currentSelectedPrompt = null;
    this.isGeneratingAIResponse = false;
  }
  
  /**
   * Get detailed AI-powered explanation
   */
  getAIExplanation(question: any): void {
    this.showAIExplanation = true;
    this.aiExplanationError = false;
    this.aiExplanation = '';
    this.streamingText = '';
    this.currentQuestionId = question.id?.toString() || '';
    this.answerIsFromDB = false;
    this.showRatingSection = false;
    this.currentQuestionForAlternative = question; // needed by generateAnimatedDiagram()

    // Check for a cached/liked answer — load instantly without streaming
    const existingRating = this.aiLearnService.getAnswerRating(this.currentQuestionId);
    if (existingRating) {
      this.currentAnswerRating = existingRating.rating;
      this.answerRatingCount = existingRating.ratingCount;
      this.userLikedAnswer = existingRating.rating >= 4;
      this.modalAnswer = '<div class="ai-loading cached"><div class="spinner fast"></div><p>⚡ Loading your saved answer instantly...</p><p class="loading-tip">💝 This is a liked answer - no API call needed!</p></div>';
      this.isLoadingAIExplanation = true;
      this.getAIExplanationLegacy(question);
      return;
    }

    // Fresh answer — use streaming for instant first-token response
    this.currentAnswerRating = 0;
    this.answerRatingCount = 0;
    this.userLikedAnswer = false;
    this.isLoadingAIExplanation = false;
    this.streamAIExplanation(question);
  }

  closeModal(): void {
    this.showModal = false;
    setTimeout(() => {
      this.modalQuestion = '';
      this.modalAnswer = '';
    }, 300);
  }

  isQuestionExpanded(questionId: number): boolean {
    return this.expandedQuestionId === questionId;
  }

  formatAnswer(answer: string): string {
    if (!answer) return '<p>No answer available.</p>';
    
    // Convert line breaks to <br> and highlight important terms
    let formatted = answer.replace(/\n/g, '<br>');
    
    // Highlight keywords with colorful badges
    const keywords = ['Angular', 'TypeScript', 'Component', 'Module', 'Service', 'Observable', 'RxJS', 
                     'HTTP', 'Router', 'Directive', 'Pipe', 'Form', 'API', 'Class', 'Interface',
                     '.NET', 'C#', 'ASP.NET', 'LINQ', 'SQL', 'OOP', 'async', 'await'];
    
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      formatted = formatted.replace(regex, `<span class="keyword-badge">$&</span>`);
    });
    
    return formatted;
  }

  getKeyPoints(answer: string): string[] {
    // Extract key points from answer
    const points: string[] = [];
    
    // Split by common delimiters
    const sentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    // Take first 3-4 meaningful sentences as key points
    for (let i = 0; i < Math.min(4, sentences.length); i++) {
      const point = sentences[i].trim();
      if (point && point.length > 15) {
        points.push(point);
      }
    }
    
    return points.length > 0 ? points : ['Review this answer carefully to understand the concept'];
  }

  /**
   * Rate the AI answer
   */
  /**
   * Simple like button - replaces star rating
   */
  likeAnswer(): void {
    if (!this.currentQuestionId) {
      console.warn('No question ID available for liking');
      return;
    }

    this.userLikedAnswer = !this.userLikedAnswer;
    
    if (this.userLikedAnswer) {
      console.log('👍 User liked this answer - saving to database...');
      
      // Save with 5 stars (liked = best rating)
      // This will REPLACE any old answer for this question ID
      this.aiLearnService.saveAnswerRating(
        this.currentQuestionId,
        this.currentQuestionForAlternative?.question || this.modalQuestion,
        this.modalCategory,
        this.aiExplanation,
        5 // Always save as 5 stars when liked
      );

      this.currentAnswerRating = 5;
      this.answerIsFromDB = true;
      
      // Get updated stats
      const rating = this.aiLearnService.getAnswerRating(this.currentQuestionId);
      if (rating) {
        this.answerRatingCount = rating.ratingCount;
      }

      console.log('💾 Answer saved! This version will be used from now on.');
    } else {
      console.log('👎 Like removed');
    }
  }

  /**
   * Save alternative (simpler) explanation to database
   * This replaces the main answer with the simpler version
   */
  saveAlternativeAnswer(): void {
    if (!this.currentQuestionId || !this.alternativeAIExplanation) {
      console.warn('❌ Cannot save: missing question ID or alternative explanation');
      return;
    }

    console.log('💾 Saving simpler explanation to database...');
    
    // Save the alternative explanation as the main answer with 5 stars
    // This will REPLACE the previous answer in the database
    this.aiLearnService.saveAnswerRating(
      this.currentQuestionId,
      this.currentQuestionForAlternative?.question || this.modalQuestion,
      this.modalCategory,
      this.alternativeAIExplanation, // Save the simpler version!
      5 // High rating so it becomes the default
    );

    this.alternativeAnswerSaved = true;
    this.currentAnswerRating = 5;
    this.answerIsFromDB = true;
    
    // Update the main answer with the alternative one
    this.aiExplanation = this.alternativeAIExplanation;
    this.modalAnswer = this.alternativeAIExplanation;
    
    console.log('✅ Simpler explanation saved! This will now be the default answer for everyone.');
    console.log('🎉 Database updated with improved version!');
  }

  rateAnswer(stars: number): void {
    if (!this.currentQuestionId || !this.aiExplanation) {
      console.warn('Cannot rate: missing question ID or explanation');
      return;
    }

    const question = this.interviewQuestions.find(q => q.id?.toString() === this.currentQuestionId);
    if (!question) {
      console.warn('Cannot rate: question not found');
      return;
    }

    // Save rating to database
    this.aiLearnService.saveAnswerRating(
      this.currentQuestionId,
      question.question,
      question.category,
      this.aiExplanation,
      stars
    );

    // Update local display
    const rating = this.aiLearnService.getAnswerRating(this.currentQuestionId);
    if (rating) {
      this.currentAnswerRating = rating.rating;
      this.answerRatingCount = rating.ratingCount;
    }

    // Show feedback
    if (stars >= 4) {
      console.log('⭐ Thanks! This answer will now be served instantly from database!');
    }
  }

  /**
   * Get star array for rating display
   */
  getStarArray(): number[] {
    return [1, 2, 3, 4, 5];
  }

  /**
   * Check if star should be filled
   */
  isStarFilled(star: number): boolean {
    return star <= Math.round(this.currentAnswerRating);
  }

  /**
   * Toggle rating section visibility
   */
  toggleRatingSection(): void {
    this.showRatingSection = !this.showRatingSection;
  }

  hasCodeExample(answer: string): boolean {
    // Check if answer likely contains code
    return answer.includes('()') || answer.includes('{}') || answer.includes('class ') || 
           answer.includes('function') || answer.includes('=>');
  }

  getCodeExample(answer: string): string {
    // Extract code-like content
    const codeMatch = answer.match(/`([^`]+)`/);
    if (codeMatch) return codeMatch[1];
    
    // Return a sample based on the answer
    return '// Check the answer above for code examples\n// Practice writing similar code yourself';
  }

  getRememberTip(answer: string): string {
    // Generate a remember tip based on the answer
    if (answer.toLowerCase().includes('component')) {
      return 'Components are the building blocks of Angular applications. Practice creating and using them!';
    } else if (answer.toLowerCase().includes('service')) {
      return 'Services help you share data and logic across components. Always use @Injectable decorator!';
    } else if (answer.toLowerCase().includes('observable')) {
      return 'Observables are powerful for handling async operations. Don\'t forget to unsubscribe!';
    } else if (answer.toLowerCase().includes('routing')) {
      return 'Routing enables navigation in single-page applications. Master route guards for better control!';
    } else if (answer.toLowerCase().includes('form')) {
      return 'Forms are essential for user input. Choose between template-driven and reactive based on complexity!';
    }
    return 'Practice this concept by building small examples. Repetition is key to mastering Angular!';
  }

  generateAnimatedDiagram(): void {
    console.log('🎨 GENERATE ANIMATED DIAGRAM CLICKED!');
    
    if (!this.currentQuestionForAlternative) {
      console.error('❌ No question available for diagram');
      return;
    }
    
    console.log('✅ Generating animated diagram for:', this.currentQuestionForAlternative.question);
    
    // Show loading state — must also show the alternative section that wraps the diagram
    this.showAlternativeExplanation = true;
    this.showAnimatedDiagram = true;
    this.isLoadingDiagram = true;
    
    const loadingHTML = `<div class="diagram-loading" style="text-align: center; padding: 2rem;">
      <div class="spinner" style="margin: 0 auto 1rem;"></div>
      <p style="font-size: 1.1rem; font-weight: 600; color: #8b5cf6;">🎨 Creating animated diagram...</p>
      <p style="font-size: 0.9rem; color: #64748b;">AI is visualizing the concept!</p>
    </div>`;
    this.diagramContent = this.sanitizer.bypassSecurityTrustHtml(loadingHTML);
    this.cdr.detectChanges();
    
    // Create AI prompt for diagram generation
    const diagramPrompt = `You are a visual learning expert creating an ANIMATED DIAGRAM explanation.

Topic: "${this.currentQuestionForAlternative.question}"

Create a simple, animated visual explanation using HTML. Follow this EXACT structure:

1. TITLE: One-line title (15-20 words max)
2. FLOW: Create 3-5 connected boxes showing the flow/process
3. Each box should have:
   - Icon/Emoji
   - Short title (2-4 words)
   - Brief description (1 sentence)
   - Visual connection to next box (arrow)

CRITICAL RULES:
• Use simple HTML with inline styles for colors/layout ONLY
• DO NOT use inline animation or transition styles (they get stripped!)
• Use the class="diagram-box" for animated boxes
• Use emojis for visual appeal
• Show clear flow with arrows (→ or ↓)
• Keep it SIMPLE - focus on core concept
• Each step should build on previous
• NO code examples in diagram (pure visual)
• NO markdown, NO code fences

EXAMPLE STRUCTURE (copy this pattern exactly):
<div style="text-align: center; margin-bottom: 1.5rem;">
  <h3 style="color: #8b5cf6; font-size: 1.3rem; font-weight: 700; margin-bottom: 0.5rem;">📊 [Concept Title]</h3>
  <p style="color: #64748b; font-size: 0.95rem;">Visual flow explanation</p>
</div>

<div style="display: flex; flex-direction: column; gap: 1rem; padding: 1rem;">
  
  <div class="diagram-box" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 1.25rem; border-left: 4px solid #f59e0b; position: relative;">
    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
      <span style="font-size: 2rem;">🎯</span>
      <strong style="color: #92400e; font-size: 1.1rem;">Step 1 Title</strong>
    </div>
    <p style="color: #78350f; font-size: 0.95rem; line-height: 1.6; margin: 0;">Brief explanation of this step</p>
  </div>
  
  <div style="text-align: center; color: #8b5cf6; font-size: 1.5rem; margin: -0.5rem 0;">↓</div>
  
  <div class="diagram-box" style="background: linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%); border-radius: 12px; padding: 1.25rem; border-left: 4px solid #8b5cf6; position: relative;">
    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
      <span style="font-size: 2rem;">⚡</span>
      <strong style="color: #5b21b6; font-size: 1.1rem;">Step 2 Title</strong>
    </div>
    <p style="color: #6b21a8; font-size: 0.95rem; line-height: 1.6; margin: 0;">Brief explanation of this step</p>
  </div>
  
  <div style="text-align: center; color: #10b981; font-size: 1.5rem; margin: -0.5rem 0;">↓</div>
  
  <div class="diagram-box" style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 12px; padding: 1.25rem; border-left: 4px solid #10b981; position: relative;">
    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
      <span style="font-size: 2rem;">✨</span>
      <strong style="color: #065f46; font-size: 1.1rem;">Final Step Title</strong>
    </div>
    <p style="color: #047857; font-size: 0.95rem; line-height: 1.6; margin: 0;">Brief explanation of this step</p>
  </div>
  
</div>

<div style="margin-top: 1.5rem; padding: 1rem; background: #f1f5f9; border-radius: 10px;">
  <p style="color: #475569; font-size: 0.9rem; line-height: 1.6; margin: 0;">💡 <strong>Key Insight:</strong> [One sentence summarizing the flow]</p>
</div>

CREATE YOUR DIAGRAM NOW - Use the diagram-box class for animations! Use 3-5 steps, colorful gradients, emojis, and clear flow!`;
    
    this.aiLearnService.getSimplifiedExplanation(diagramPrompt).subscribe({
      next: (response) => {
        console.log('🎉 Diagram API response received:', response);
        this.isLoadingDiagram = false;
        
        if (response.success && response.explanation && response.explanation.trim().length > 0) {
          console.log('✅ Valid diagram content received, length:', response.explanation.length);
          
          // Use cleanDiagramHTML instead of cleanMarkdownCodeFences
          // This preserves all HTML/CSS for animations
          const cleanedHTML = this.cleanDiagramHTML(response.explanation);
          
          if (cleanedHTML && cleanedHTML.trim().length > 50) {
            this.diagramContent = this.sanitizer.bypassSecurityTrustHtml(cleanedHTML);
            console.log('✅ Diagram content set with animations!');
            this.cdr.detectChanges();
          } else {
            console.error('❌ Cleaned HTML too short:', cleanedHTML);
            const errorHTML = `<div style="text-align: center; padding: 2rem; color: #ef4444;">
              <p style="font-size: 1.1rem; font-weight: 600;">⚠️ Diagram generation incomplete</p>
              <p style="font-size: 0.9rem;">AI response was too short. Please try again.</p>
              <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #8b5cf6; color: white; border: none; border-radius: 8px; cursor: pointer;">Reload & Try Again</button>
            </div>`;
            this.diagramContent = this.sanitizer.bypassSecurityTrustHtml(errorHTML);
            this.cdr.detectChanges();
          }
        } else {
          console.error('❌ Failed to generate diagram - Invalid response:', {
            success: response.success,
            hasExplanation: !!response.explanation,
            explanationLength: response.explanation?.length || 0,
            error: response.error || 'Unknown'
          });
          
          const errorHTML = `<div style="text-align: center; padding: 2rem; color: #ef4444;">
            <p style="font-size: 1.1rem; font-weight: 600;">⚠️ Failed to generate diagram</p>
            <p style="font-size: 0.9rem;">${response.error || 'AI did not return valid content'}</p>
            <p style="font-size: 0.85rem; color: #94a3b8; margin-top: 0.5rem;">Provider: ${response.provider || 'Unknown'}</p>
            <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #8b5cf6; color: white; border: none; border-radius: 8px; cursor: pointer;">Reload & Try Again</button>
          </div>`;
          this.diagramContent = this.sanitizer.bypassSecurityTrustHtml(errorHTML);
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('❌ Diagram generation error:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        this.isLoadingDiagram = false;
        
        let errorMessage = 'Network error or API unavailable';
        if (error.status === 429) {
          errorMessage = 'Rate limit reached. Please wait a moment and try again.';
        } else if (error.status === 0) {
          errorMessage = 'Network error. Check your internet connection.';
        } else if (error.error?.error?.message) {
          errorMessage = error.error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        const errorHTML = `<div style="text-align: center; padding: 2rem; color: #ef4444;">
          <p style="font-size: 1.1rem; font-weight: 600;">⚠️ Error generating diagram</p>
          <p style="font-size: 0.9rem;">${errorMessage}</p>
          <p style="font-size: 0.85rem; color: #94a3b8; margin-top: 0.5rem;">Status: ${error.status || 'Unknown'}</p>
          <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #8b5cf6; color: white; border: none; border-radius: 8px; cursor: pointer;">Reload & Try Again</button>
        </div>`;
        this.diagramContent = this.sanitizer.bypassSecurityTrustHtml(errorHTML);
        this.cdr.detectChanges();
      }
    });
  }

  showAlternativeAnswer(): void {
    console.log('🔄🔄🔄 REGENERATE BUTTON CLICKED! 🔄🔄🔄');
    console.log('Current state:', {
      showAlternativeExplanation: this.showAlternativeExplanation,
      isLoadingAlternative: this.isLoadingAlternative,
      currentQuestionForAlternative: this.currentQuestionForAlternative?.question
    });
    
    if (!this.currentQuestionForAlternative) {
      console.error('❌ No question available for alternative explanation');
      console.error('This should not happen! Question should be set when modal opens.');
      return;
    }
    
    console.log('✅ Question found! Proceeding with regeneration...');

    // IMMEDIATELY clear old content and show we're regenerating
    this.alternativeAIExplanation = ''; // Clear old content first
    this.alternativeContentSafe = ''; // Clear sanitized content
    this.showAlternativeExplanation = true;
    this.isLoadingAlternative = true;
    this.alternativeAnswerSaved = false; // Reset save state for new alternative
    this.alternativeAnswerLiked = false; // Reset like state for new alternative
    this.currentAlternativeProvider = ''; // Reset provider
    this.regenerationCount++; // Increment for variety
    
    console.log(`🔢 Regeneration #${this.regenerationCount} - Will force different response!`);
    
    // Show loading state IMMEDIATELY with generation counter
    const loadingHTML = `<div class="ai-loading" style="text-align: center; padding: 3rem 1.5rem;">
      <div class="spinner" style="margin: 0 auto 1.5rem;"></div>
      <p style="font-size: 1.2rem; font-weight: 700; color: #667eea; margin-bottom: 0.5rem;">🤔 AI Agent is thinking...</p>
      <p style="font-size: 1.05rem; color: #64748b; margin-bottom: 1rem;">Breaking this down in a completely unique way!</p>
      <p class="loading-tip" style="font-size: 0.95rem; color: #f59e0b; font-weight: 600;">✨ Generation #${this.regenerationCount} - Fresh perspective coming!</p>
    </div>`;
    this.alternativeAIExplanation = loadingHTML;
    this.alternativeContentSafe = this.sanitizer.bypassSecurityTrustHtml(loadingHTML);
    
    // Force Angular to detect changes immediately
    this.cdr.detectChanges();
    
    console.log('🎯 Loading state set! Making API call...');
    
    // Generate variety instructions based on regeneration count
    const varietyPrompts = [
      { type: 'Cooking Analogy', instruction: 'Use a cooking/recipe analogy to explain this.' },
      { type: 'Step-by-Step Tutorial', instruction: 'Explain this as a simple step-by-step tutorial with numbered stages.' },
      { type: 'Visual Diagram Description', instruction: 'Describe this as if drawing a visual diagram (boxes, arrows, flow).' },
      { type: 'Real-World Story', instruction: 'Tell a real-world story or scenario that demonstrates this concept.' },
      { type: 'Code Deep Dive', instruction: 'Focus heavily on code examples with detailed explanations of each line.' },
      { type: 'ELI5 (Simple)', instruction: 'Explain Like I\'m 5 - use the simplest possible language a child would understand.' },
      { type: 'Interview Answer', instruction: 'Structure this as a perfect interview answer with talking points.' },
      { type: 'Common Mistakes', instruction: 'Focus on common mistakes beginners make and how to avoid them.' },
      { type: 'Comparison Table', instruction: 'Compare and contrast different aspects using a structured comparison approach.' },
      { type: 'Sports Analogy', instruction: 'Use a sports or gaming analogy to explain this.' },
      { type: 'Movie/TV Analogy', instruction: 'Use a movie/TV show analogy to explain this.' },
      { type: 'Building Analogy', instruction: 'Use a construction/building analogy to explain this.' }
    ];
    
    const currentVarietyObj = varietyPrompts[(this.regenerationCount - 1) % varietyPrompts.length];
    const timestamp = Date.now(); // Add uniqueness
    const randomSeed = Math.floor(Math.random() * 1000000); // Extra randomness
    
    console.log(`🎨 Using variety: ${currentVarietyObj.type} - ${currentVarietyObj.instruction}`);
    console.log(`🔢 Timestamp: ${timestamp}, Random seed: ${randomSeed}`);
    
    // 🧠 ULTRA-MEMORABLE REGENERATION PROMPT - Each version should be UNFORGETTABLE
    const simplePrompt = `You are creating the MOST MEMORABLE explanation possible - make it stick forever!

Topic: "${this.currentQuestionForAlternative.question}"
Generation #${this.regenerationCount} | Style: ${currentVarietyObj.type}
Unique ID: ${timestamp}-${randomSeed}

CRITICAL RULES:
• Do NOT repeat the question (already visible above)
• Use DEAD SIMPLE language (like explaining to a friend)
• ${currentVarietyObj.instruction}
• Create VIVID mental pictures
• Include MEMORY TRICKS (mnemonics, stories, acronyms)
• Make it SO CLEAR they'll remember it in 6 months
• Make this version COMPLETELY DIFFERENT from any previous explanation
• NEVER use diamond symbols (♦ ◆) or special Unicode characters in your output

MEMORABLE STRUCTURE (400-450 words):

🎯 **ONE-SENTENCE MAGIC:**
[Write THE most quotable, memorable one-liner that captures this concept perfectly]

🏠 **${currentVarietyObj.type.toUpperCase()}:**
[Follow the style instruction: ${currentVarietyObj.instruction}
Paint a VIVID picture with specific details - names, actions, scenarios
Make it a mini-story or clear explanation (4-6 sentences)
Connect EVERY part to the technical concept clearly]

🧩 **THE SIMPLE BREAKDOWN:**
**Step 1: [Action in plain English]**
[What happens first - explain like telling a story]

**Step 2: [Next action]**
[What happens next - build the mental model]

**Step 3: [Final action]**
[How it completes - make the "aha!" moment]

[Add 2 sentences connecting all steps into one coherent picture]

💻 **CODE THAT CLICKS:**
\`\`\`typescript
// Super clear example - every line obvious
// Comments in plain English
// 8-10 lines maximum
// Use names like "user", "order", "product" - real things
\`\`\`
**In plain English:** [Explain what this code does like describing it to a non-programmer]

🧠 **MEMORY TRICK TO REMEMBER THIS:**
[Create an acronym, rhyme, or mini-story that embeds the concept
Example: "Remember **C.A.R.** = Component, Always, Reuses" or tell a 2-sentence story]

✨ **THE "AHA!" INSIGHT:**
[The ONE thing that makes everything click - the lightbulb moment
Make this profound but simple]

📌 **INTERVIEW CHEAT CODE:**
*When asked this, remember these 3 things:*
1. [3-5 word summary]
2. [Mental image or pattern]
3. [The impressive detail to mention]

⚠️ **EASY CONFUSION (DON'T MIX IT UP!):**
People confuse this with [related concept]. Here's the difference:
• **This concept** = [simple distinction]
• **Other concept** = [simple distinction]
**Memory trick:** [2-sentence way to never confuse them again]

🎤 **SAY THIS TO IMPRESS:**
"[One sentence they can say in an interview that makes them sound expert-level]"

QUALITY CHECKLIST:
✓ Every sentence is SIMPLE and CLEAR
✓ Creates MENTAL PICTURES
✓ Includes MEMORY HOOKS
✓ Uses ${currentVarietyObj.type} theme consistently
✓ Clean HTML only: <p>, <strong>, <em>, <code>, <br>, <ul>, <li>
✓ NO markdown code fences in output (NO \`\`\`html wrappers)
✓ COMPLETELY DIFFERENT from previous versions
✓ So memorable they'll remember it months later

Make every word count. Make it unforgettable!`;    

    this.aiLearnService.getSimplifiedExplanation(simplePrompt).subscribe({
      next: (response) => {
        console.log('🎉 API CALL COMPLETED! Response received.');
        console.log('Setting isLoadingAlternative = false');
        this.isLoadingAlternative = false;
        
        if (response.success && response.explanation && response.explanation.trim().length > 0) {
          // Clean markdown code fences before rendering
          const cleanedHTML = this.cleanMarkdownCodeFences(response.explanation);
          this.alternativeAIExplanation = cleanedHTML;
          this.currentAlternativeProvider = response.provider || 'gemini'; // Track which provider was used
          
          console.log('='.repeat(80));
          console.log('✅ Got simplified explanation from:', this.currentAlternativeProvider);
          console.log('Content length:', cleanedHTML.length);
          console.log('Full content:');
          console.log(cleanedHTML);
          console.log('='.repeat(80));
          
          // Check if content seems too short (might be truncated)
          if (cleanedHTML.length < 100) {
            console.warn('⚠️ Content seems very short! Might be truncated.');
          }
          
          // Sanitize and store for template
          this.alternativeContentSafe = this.sanitizer.bypassSecurityTrustHtml(cleanedHTML);
          
          // Force change detection
          this.cdr.detectChanges();
          console.log('✅ Content updated and change detection triggered!');
        } else {
          // AI returned empty or failed - show helpful error
          console.error('❌ AI returned empty content. Likely API rate limit reached.');
          this.currentAlternativeProvider = 'error';
          const errorContent = `
            <div style="text-align: center; padding: 3rem 1.5rem; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 16px; margin: 1rem 0;">
              <div style="font-size: 3rem; margin-bottom: 1rem;">🔑</div>
              <h3 style="color: #92400e; font-size: 1.4rem; margin-bottom: 1rem; font-weight: 700;">API Rate Limit Reached</h3>
              <p style="color: #78350f; font-size: 1.1rem; line-height: 1.8; margin-bottom: 1.5rem;">
                All free AI providers are at their daily limit. <strong>The main answer above</strong> contains the complete explanation.
              </p>
              <div style="background: white; padding: 1.5rem; border-radius: 12px; margin-top: 1.5rem; text-align: left;">
                <p style="color: #1f2937; font-size: 1rem; line-height: 1.7; margin-bottom: 0.8rem;">💡 <strong>To get AI-powered explanations:</strong></p>
                <ol style="color: #4b5563; font-size: 0.95rem; line-height: 1.8; margin-left: 1.5rem;">
                  <li>Add more free API keys (see API_PROVIDERS_SETUP_GUIDE.md)</li>
                  <li>Or wait 24 hours for rate limits to reset</li>
                  <li>Or use the comprehensive answer provided above</li>
                </ol>
              </div>
            </div>
          `;
          this.alternativeAIExplanation = errorContent;
          this.alternativeContentSafe = this.sanitizer.bypassSecurityTrustHtml(errorContent);
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('❌ API CALL FAILED! Network or API error.');
        console.error('Error details:', error);
        this.isLoadingAlternative = false;
        
        const errorContent = `
          <div style="text-align: center; padding: 3rem 1.5rem; background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-radius: 16px; margin: 1rem 0;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
            <h3 style="color: #991b1b; font-size: 1.4rem; margin-bottom: 1rem; font-weight: 700;">AI Service Temporarily Unavailable</h3>
            <p style="color: #7f1d1d; font-size: 1.1rem; line-height: 1.8; margin-bottom: 1.5rem;">
              Unable to connect to AI providers. <strong>The main answer above</strong> contains complete information.
            </p>
            <div style="background: white; padding: 1.5rem; border-radius: 12px; margin-top: 1.5rem; text-align: left;">
              <p style="color: #1f2937; font-size: 1rem; line-height: 1.7; margin-bottom: 0.8rem;">💡 <strong>Possible reasons:</strong></p>
              <ul style="color: #4b5563; font-size: 0.95rem; line-height: 1.8; margin-left: 1.5rem;">
                <li>Network connectivity issue</li>
                <li>API services are down temporarily</li>
                <li>Rate limits reached on all providers</li>
              </ul>
              <p style="color: #1f2937; font-size: 1rem; line-height: 1.7; margin-top: 1rem;">🔄 Try refreshing or check back in a few minutes.</p>
            </div>
          </div>
        `;
        this.alternativeAIExplanation = errorContent;
        this.alternativeContentSafe = this.sanitizer.bypassSecurityTrustHtml(errorContent);
        this.cdr.detectChanges();
      }
    });
  }

  initializeSlideshow(question: any): void {
    this.slideshowMode = true;
    this.currentSlide = 0;
    this.slides = this.createSlidesFromAnswer(question);
    this.totalSlides = this.slides.length;
  }

  createSlidesFromAnswer(question: any): any[] {
    const slides: any[] = [];
    const answer = question.answer;
    const questionText = question.question;
    
    // Slide 1: Introduction
    slides.push({
      type: 'intro',
      title: '📚 Let\'s Learn Together!',
      content: questionText,
      icon: '🎯'
    });

    // Slide 2: Main Answer (split into parts if long)
    const answerParts = answer.split('\n\n');
    answerParts.forEach((part: string, index: number) => {
      if (part.trim()) {
        slides.push({
          type: 'content',
          title: index === 0 ? '💡 Main Concept' : `📝 Part ${index}`,
          content: this.formatAnswer(part),
          icon: '💡'
        });
      }
    });

    // Slide 3: Simple Explanation
    slides.push({
      type: 'simple',
      title: '🌟 In Simple Words',
      content: this.getSimpleExplanation(questionText.toLowerCase(), question.category),
      icon: '🌟'
    });

    // Slide 4: When to Use
    slides.push({
      type: 'usage',
      title: '🎯 When to Use This',
      content: this.getUsageScenario(questionText.toLowerCase(), question.category),
      icon: '🎯'
    });

    // Slide 5: Key Points
    const keyPoints = this.getKeyPoints(answer);
    if (keyPoints.length > 0) {
      slides.push({
        type: 'keypoints',
        title: '⭐ Key Takeaways',
        content: keyPoints,
        icon: '⭐'
      });
    }

    // Slide 6: Remember Tip
    slides.push({
      type: 'remember',
      title: '📌 Remember',
      content: this.getRememberTip(answer),
      icon: '📌'
    });

    return slides;
  }

  nextSlide(): void {
    if (this.currentSlide < this.totalSlides - 1) {
      this.currentSlide++;
    }
  }

  previousSlide(): void {
    if (this.currentSlide > 0) {
      this.currentSlide--;
    }
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
  }

  exitSlideshow(): void {
    this.slideshowMode = false;
    this.currentSlide = 0;
  }

  showAlternativeFromSlideshow(): void {
    this.slideshowMode = false;
    this.showAlternativeExplanation = true;
  }

  getDetailedAnswer(question: any): string {
    const answer = question.answer;
    
    if (!answer) {
      return '<p style="color: #ef4444;">No answer available yet.</p>';
    }

    // Format the answer with proper HTML structure
    let formatted = '<div class="detailed-answer-wrapper">';
    
    // Main answer with formatted paragraphs
    const paragraphs = answer.split('\n\n');
    paragraphs.forEach((para: string) => {
      if (para.trim()) {
        // Check if it's a list or bullet points
        if (para.includes('\n-') || para.includes('\n•')) {
          const lines = para.split('\n');
          const title = lines[0];
          if (title && title.trim() && !title.startsWith('-') && !title.startsWith('•')) {
            formatted += `<h4 class="answer-section-title">${this.formatText(title)}</h4>`;
            formatted += '<ul class="answer-list">';
            lines.slice(1).forEach((line: string) => {
              if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
                formatted += `<li>${this.formatText(line.replace(/^[-•]\s*/, ''))}</li>`;
              }
            });
            formatted += '</ul>';
          } else {
            formatted += '<ul class="answer-list">';
            lines.forEach((line: string) => {
              if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
                formatted += `<li>${this.formatText(line.replace(/^[-•]\s*/, ''))}</li>`;
              } else if (line.trim()) {
                formatted += `<p class="answer-paragraph">${this.formatText(line)}</p>`;
              }
            });
            formatted += '</ul>';
          }
        } else {
          formatted += `<p class="answer-paragraph">${this.formatText(para)}</p>`;
        }
      }
    });

    formatted += '</div>';
    return formatted;
  }

  formatText(text: string): string {
    // Highlight important terms
    const keywords = ['Angular', 'TypeScript', 'Component', 'Module', 'Service', 'Observable', 'RxJS',
                     'HTTP', 'Router', 'Directive', 'Pipe', 'Form', 'API', 'Class', 'Interface',
                     '.NET', 'C#', 'ASP.NET', 'Entity Framework', 'LINQ', 'SQL', 'JavaScript',
                     'Array', 'Object', 'Function', 'async', 'await', 'Promise', 'JSON'];
    
    let formatted = text;
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      formatted = formatted.replace(regex, `<strong class="highlight">$&</strong>`);
    });

    // Format code snippets
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    
    return formatted;
  }

  getSimpleExplanation(questionText: string, category: string): string {
    if (questionText.includes('component')) {
      return `Think of components like <strong>LEGO blocks</strong>. Each block (component) has its own shape, color, and purpose. You combine these blocks to build something bigger - your complete application. Just like you can reuse the same LEGO block in different structures, you can reuse components across your app!`;
    } else if (questionText.includes('service')) {
      return `Imagine a <strong>library</strong> in your school. Instead of every student carrying all books, there's one central library (service) that everyone can visit to get the book they need. Similarly, services store shared data and functionality that multiple components can access.`;
    } else if (questionText.includes('observable')) {
      return `Think of observables like <strong>subscribing to a YouTube channel</strong>. When you subscribe, you get notified whenever new content arrives. You don't have to keep checking - the notification comes to you automatically. That's exactly how observables work with data!`;
    } else if (questionText.includes('routing')) {
      return `Routing is like a <strong>GPS navigation system</strong>. When you want to go somewhere (a different page), you tell the GPS (router) where you want to go, and it takes you there while keeping track of where you've been (browser history).`;
    } else if (questionText.includes('directive')) {
      return `Directives are like <strong>magic wands</strong> that add special powers to regular HTML elements. Want to hide something? Wave the *ngIf wand. Want to repeat items? Use the *ngFor wand. They enhance what HTML can do!`;
    } else if (questionText.includes('form')) {
      return `Forms are like <strong>paper forms</strong> you fill at a doctor's office, but smarter! They can validate your input (like checking if email format is correct), show error messages, and even submit data automatically. Template-driven is like pre-printed forms, Reactive forms are like custom digital forms you design yourself.`;
    } else if (questionText.includes('pipe')) {
      return `Pipes are like <strong>Instagram filters</strong> for your data. Just like filters transform how photos look, pipes transform how data appears without changing the original. Want a date in different format? Apply a date pipe!`;
    } else if (questionText.includes('module')) {
      return `Modules are like <strong>folders in a filing cabinet</strong>. Instead of throwing all papers in one place, you organize related documents in folders. Similarly, modules group related components, services, and features together for better organization.`;
    } else if (questionText.includes('dependency injection') || questionText.includes('di')) {
      return `DI is like <strong>room service in a hotel</strong>. Instead of going out to get food yourself (creating dependencies), you call room service and they bring it to you (inject dependencies). Angular handles the delivery automatically!`;
    } else if (questionText.includes('lifecycle')) {
      return `Component lifecycle is like <strong>human life stages</strong>: birth (ngOnInit), growth and changes (ngOnChanges), and eventually departure (ngOnDestroy). At each stage, you can perform specific actions just like in life!`;
    }
    
    return `This concept is fundamental in ${category}. Understanding it will help you build better applications and solve problems more efficiently. Take your time to practice and experiment with real examples.`;
  }

  getUsageScenario(questionText: string, category: string): string {
    if (questionText.includes('component')) {
      return `Use components when you need <strong>reusable UI pieces</strong>. For example: a user card, navigation bar, or form input field that appears multiple times in your app.`;
    } else if (questionText.includes('service')) {
      return `Use services when you need to <strong>share data or logic</strong> between multiple components. For example: user authentication, API calls, or shared shopping cart data.`;
    } else if (questionText.includes('observable')) {
      return `Use observables for <strong>asynchronous operations</strong> like API calls, user input events, or real-time data updates. Perfect for handling data that arrives over time.`;
    } else if (questionText.includes('routing')) {
      return `Use routing when building <strong>multi-page applications</strong> (SPA). It allows users to navigate between different views while staying on the same page, creating a seamless experience.`;
    } else if (questionText.includes('directive')) {
      return `Use directives to <strong>manipulate DOM elements</strong> or add behavior. Structural directives (ngIf, ngFor) change layout, attribute directives (ngClass, ngStyle) change appearance.`;
    } else if (questionText.includes('form')) {
      return `Use forms for <strong>user input collection</strong>: login pages, registration, surveys, search boxes. Choose template-driven for simple forms, reactive for complex forms with dynamic validation.`;
    } else if (questionText.includes('pipe')) {
      return `Use pipes to <strong>transform display data</strong> without changing the source. Perfect for formatting dates, currency, text case, or creating custom data transformations in templates.`;
    } else if (questionText.includes('guard')) {
      return `Use route guards to <strong>protect routes</strong> and control access. For example: preventing unauthorized users from accessing admin pages, or warning users about unsaved changes before leaving.`;
    } else if (questionText.includes('interceptor')) {
      return `Use interceptors to <strong>modify HTTP requests/responses</strong> globally. Perfect for adding authentication tokens, logging API calls, or handling errors in one central place.`;
    }
    
    return `This is commonly used in real-world ${category} applications. Practice implementing it in your projects to gain hands-on experience.`;
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goToPage(page: number): void {
    this.currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  closeMobileModal(): void {
    this.expandedQuestionId = null;
    this.slideshowMode = false;
    this.showAlternativeExplanation = false;
  }

  getCurrentQuestion(): any {
    if (this.expandedQuestionId === null) return null;
    return this.interviewQuestions.find(q => q.id === this.expandedQuestionId);
  }

  backToMainAnswer(): void {
    this.showAlternativeExplanation = false;
    this.alternativeAIExplanation = '';
    this.alternativeContentSafe = '';
    this.isLoadingAlternative = false;
  }

  /**
   * Clean diagram HTML - preserves ALL HTML and styles
   * Only removes markdown code fences and diamond symbols
   * Does NOT parse sections - used for visual diagrams
   */
  cleanDiagramHTML(content: string): string {
    if (!content) {
      console.error('❌ cleanDiagramHTML: NO CONTENT');
      return '';
    }
    
    console.log('🎨 CLEANING DIAGRAM HTML - START');
    console.log('📝 Original length:', content.length);
    
    // Remove markdown code fences only
    let cleaned = content
      .replace(/```html\s*/gi, '')
      .replace(/```typescript\s*/gi, '')
      .replace(/```javascript\s*/gi, '')
      .replace(/```css\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    
    // Remove diamond symbols only - preserve ALL other HTML
    for (let i = 0; i < 3; i++) {
      cleaned = cleaned
        .replace(/[\u2666\u2665\u2663\u2660\u25C6\u25C7\uFFFD\u25CA\u25CB]/g, '')
        .replace(/[♦♥♣♠◆◇�]/g, '')
        .replace(/&#9830;|&diams;|&#x25C6;/g, '');
    }
    
    console.log('✅ Diagram HTML cleaned, length:', cleaned.length);
    console.log('📝 First 300 chars:', cleaned.substring(0, 300));
    
    return cleaned;
  }

  /**
   * Strip a leading title line from AI response if it duplicates the question title.
   */
  stripLeadingTitle(content: string, questionTitle: string): string {
    if (!content || !questionTitle) return content;
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const lines = content.split('\n');
    // Remove up to 2 lines at the top if they match the question title
    let start = 0;
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i].replace(/[#*_`>]/g, '').trim();
      if (line && normalize(line) === normalize(questionTitle)) {
        start = i + 1;
        break;
      }
    }
    if (start === 0) return content;
    // Skip blank lines right after the removed title
    while (start < lines.length && lines[start].trim() === '') start++;
    return lines.slice(start).join('\n');
  }

  /**
   * Clean markdown code fences from AI responses
   * Strips ```html, ```typescript, ``` etc. and extracts pure HTML
   */
  cleanMarkdownCodeFences(content: string): string {
    if (!content) {
      console.error('❌ cleanMarkdownCodeFences: NO CONTENT');
      return '';
    }
    
    console.log('🧹 FORMATTING - START');
    console.log('📝 Original content length:', content.length);
    console.log('📝 First 500 chars:', content.substring(0, 500));
    
    // Remove markdown code fences
    let cleaned = content
      .replace(/```html\s*/gi, '')
      .replace(/```typescript\s*/gi, '')
      .replace(/```javascript\s*/gi, '')
      .replace(/```css\s*/gi, '')
      .replace(/```csharp\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    
    // AGGRESSIVELY remove ALL problematic symbols - multiple passes
    for (let i = 0; i < 3; i++) {
      cleaned = cleaned
        .replace(/[\u2666\u2665\u2663\u2660\u25C6\u25C7\uFFFD\u25CA\u25CB]/g, '')
        .replace(/[♦♥♣♠◆◇�]/g, '')
        .replace(/&#9830;|&diams;|&#x25C6;/g, '')
        .replace(/^[\s]*[♦◆�][\s]*/gm, '')
        .replace(/[\s]+[♦◆�][\s]+/g, ' ')
        .replace(/[♦◆�][\s]*/g, '');
    }
    
    console.log('🧹 After cleaning diamonds, length:', cleaned.length);
    
    // NEW APPROACH: Use regex to split content by section headers
    // This handles sections on same line or different lines
    // Pattern: emoji (optional) + <strong> (optional) + CAPS WORDS (2+) + colon or :</strong>
    const sectionPattern = /([🎯💡🎨🍳🏠🌟🧩🌿💻✅🧠✨📌⚠️❌🎤🔑])?\s*(<strong>)?([A-Z][A-Z\s\-"'!]{2,}?)(:<\/strong>|:)/g;
    
    console.log('🔍 Testing section pattern against content...');
    console.log('🔍 Pattern:', sectionPattern.toString());
    
    // Test if pattern matches anything
    const testMatch = cleaned.match(sectionPattern);
    if (testMatch) {
      console.log('✅ Pattern found', testMatch.length, 'potential matches:');
      testMatch.forEach((m, i) => console.log(`   ${i + 1}. "${m}"`));
    } else {
      console.log('❌ Pattern found NO matches in content');
      console.log('📄 Full cleaned content:', cleaned);
    }
    
    const sections: Array<{emoji: string, title: string, content: string}> = [];
    let lastIndex = 0;
    let match;
    let matchCount = 0;
    
    while ((match = sectionPattern.exec(cleaned)) !== null) {
      matchCount++;
      const emoji = match[1] || '';
      const title = match[3].trim();
      const sectionStart = match.index + match[0].length;
      
      console.log(`✅ MATCH ${matchCount}:`);
      console.log(`   - Full match: "${match[0]}"`);
      console.log(`   - Position: ${match.index}`);
      console.log(`   - Emoji: "${emoji}"`);
      console.log(`   - Title: "${title}"`);
      console.log(`   - Section starts at: ${sectionStart}`);
      
      // If this is not the first match, add previous section's content
      if (sections.length > 0) {
        sections[sections.length - 1].content = cleaned.substring(lastIndex, match.index).trim();
      } else if (match.index > 0) {
        // Add intro text before first section
        const intro = cleaned.substring(0, match.index).trim();
        if (intro.length > 20) {
          sections.push({emoji: '', title: '', content: intro});
        }
      }
      
      sections.push({
        emoji: emoji.replace(/[♦◆�]/g, ''),
        title: title.replace(/[♦◆�]/g, ''),
        content: ''
      });
      
      lastIndex = sectionStart;
    }
    
    // Add content for last section
    if (sections.length > 0 && lastIndex < cleaned.length) {
      sections[sections.length - 1].content = cleaned.substring(lastIndex).trim();
    }
    
    console.log(`📊 Found ${sections.length} sections (${matchCount} matches)`);
    sections.forEach((s, i) => {
      console.log(`  Section ${i}: emoji="${s.emoji}" title="${s.title}" content=${s.content.length} chars`);
    });
    
    // If no sections found with main pattern, try fallback pattern
    if (sections.length === 0) {
      console.log('⚠️ No sections with main pattern, trying FALLBACK pattern...');
      
      // Simpler fallback: any line with 2+ capital words and a colon
      const fallbackPattern = /^([🎯💡🎨🍳🏠🌟🧩🌿💻✅🧠✨📌⚠️❌🎤🔑])?\s*([A-Z][A-Z\s\-"'!]{2,}):\s*(.*)$/gm;
      
      cleaned.split('\n').forEach(line => {
        const match = line.match(/^([🎯💡🎨🍳🏠🌟🧩🌿💻✅🧠✨📌⚠️❌🎤🔑])?\s*([A-Z][A-Z\s\-"'!]{2,}):\s*(.*)$/);
        if (match) {
          console.log(`   ✅ Fallback matched: "${match[2]}"`);
          sections.push({
            emoji: match[1] || '',
            title: match[2].trim(),
            content: match[3] || ''
          });
        }
      });
      
      console.log(`📊 After fallback: Found ${sections.length} sections`);
    }
    
    // If STILL no sections found, return as simple text
    if (sections.length === 0) {
      console.log('❌ NO SECTIONS FOUND with any pattern, returning as plain text');
      console.log('📄 This usually means AI returned content without section headers');
      // Remove HTML tags for plain format
      cleaned = cleaned
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<p[^>]*>/gi, '')
        .replace(/<strong>/gi, '<strong>')
        .replace(/<\/strong>/gi, '</strong>')
        .replace(/<[^>]+>/g, '');
      
      return `<div style="padding: 1rem 0.75rem; font-size: 0.95rem; line-height: 1.7; color: #334155;">${cleaned}</div>`;
    }
    
    // Build beautiful HTML with colored sections
    let html = '';
    
    sections.forEach((section, idx) => {
      // Clean content - remove HTML tags
      let cleanContent = section.content
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<p[^>]*>/gi, '')
        .replace(/<div[^>]*>/gi, '')
        .replace(/<\/div>/gi, '\n')
        .replace(/<strong>/gi, '<strong>')
        .replace(/<\/strong>/gi, '</strong>')
        .replace(/<em>/gi, '<em>')
        .replace(/<\/em>/gi, '</em>')
        .replace(/<ul[^>]*>/gi, '<ul>')
        .replace(/<\/ul>/gi, '</ul>')
        .replace(/<li[^>]*>/gi, '<li>')
        .replace(/<\/li>/gi, '</li>')
        .replace(/<code>/gi, '<code>')
        .replace(/<\/code>/gi, '</code>')
        .replace(/<[^>]+>/g, '')
        .trim();
      
      // Intro section (no title)
      if (!section.title && cleanContent) {
        html += `<div style="margin-bottom: 1rem; padding: 0.875rem 0.625rem; font-size: 0.9rem; line-height: 1.65; color: #334155; background: #f8fafc; border-radius: 10px; word-wrap: break-word;">${cleanContent}</div>`;
        return;
      }
      
      if (!section.title) return;
      
      const titleUpper = section.title.toUpperCase();
      
      // Color schemes
      let bgColor, borderColor, textColor, titleColor, shadowColor;
      
      if (titleUpper.includes('MAGIC') || titleUpper.includes('SENTENCE')) {
        bgColor = '#fefce8'; borderColor = '#f59e0b'; textColor = '#78350f'; titleColor = '#92400e'; shadowColor = 'rgba(245, 158, 11, 0.1)';
      } else if (titleUpper.includes('ANALOGY') || titleUpper.includes('COOKING') || titleUpper.includes('STORY')) {
        bgColor = '#fff7ed'; borderColor = '#fb923c'; textColor = '#7c2d12'; titleColor = '#9a3412'; shadowColor = 'rgba(251, 146, 60, 0.12)';
      } else if (titleUpper.includes('CODE') || titleUpper.includes('EXAMPLE')) {
        bgColor = '#f0fdf4'; borderColor = '#10b981'; textColor = '#064e3b'; titleColor = '#065f46'; shadowColor = 'rgba(16, 185, 129, 0.1)';
      } else if (titleUpper.includes('BREAKDOWN') || titleUpper.includes('STEP')) {
        bgColor = '#ecfdf5'; borderColor = '#34d399'; textColor = '#064e3b'; titleColor = '#047857'; shadowColor = 'rgba(52, 211, 153, 0.12)';
      } else if (titleUpper.includes('MEMORY') || titleUpper.includes('TRICK')) {
        bgColor = '#faf5ff'; borderColor = '#a855f7'; textColor = '#581c87'; titleColor = '#6b21a8'; shadowColor = 'rgba(168, 85, 247, 0.1)';
      } else if (titleUpper.includes('INTERVIEW') || titleUpper.includes('IMPRESS')) {
        bgColor = '#eff6ff'; borderColor = '#3b82f6'; textColor = '#1e3a8a'; titleColor = '#1e40af'; shadowColor = 'rgba(59, 130, 246, 0.1)';
      } else if (titleUpper.includes('MISTAKE') || titleUpper.includes('AVOID') || titleUpper.includes('WRONG') || titleUpper.includes('CONFUSION')) {
        bgColor = '#fef2f2'; borderColor = '#f87171'; textColor = '#7f1d1d'; titleColor = '#991b1b'; shadowColor = 'rgba(248, 113, 113, 0.12)';
      } else {
        bgColor = '#faf5ff'; borderColor = '#8b5cf6'; textColor = '#4c1d95'; titleColor = '#5b21b6'; shadowColor = 'rgba(139, 92, 246, 0.1)';
      }
      
      // Process steps if present
      let processedContent = cleanContent;
      const hasSteps = /Step\s+\d+:/i.test(cleanContent);
      
      if (hasSteps) {
        console.log('🔢 Processing steps in section:', section.title);
        // Match steps more flexibly
        const stepParts = cleanContent.split(/(?=Step\s+\d+:)/i);
        let stepsHTML = '';
        
        stepParts.forEach(part => {
          const stepMatch = part.match(/Step\s+(\d+):\s*([^\n.]+)[\.\s]*([\s\S]*)/i);
          if (stepMatch) {
            const stepNum = stepMatch[1];
            const stepTitle = stepMatch[2].trim();
            const stepContent = stepMatch[3].trim();
            const delay = (parseInt(stepNum) - 1) * 0.15;
            
            console.log(`  Step ${stepNum}: "${stepTitle}"`);
            
            stepsHTML += `
              <div class="animated-step" style="
                margin: 0.75rem 0;
                padding: 0.875rem 0.625rem;
                background: white;
                border-left: 3px solid ${borderColor};
                border-radius: 8px;
                animation: slideInStep 0.6s ease-out ${delay}s both;
                box-shadow: 0 2px 6px ${shadowColor};
              ">
                <div style="
                  display: flex;
                  align-items: center;
                  gap: 0.5rem;
                  margin-bottom: 0.5rem;
                ">
                  <span style="
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 26px;
                    height: 26px;
                    background: linear-gradient(135deg, ${borderColor} 0%, ${titleColor} 100%);
                    color: white;
                    border-radius: 50%;
                    font-weight: 700;
                    font-size: 0.8rem;
                    flex-shrink: 0;
                  ">${stepNum}</span>
                  <strong style="
                    color: ${titleColor};
                    font-size: 0.9rem;
                    font-weight: 700;
                  ">${stepTitle}</strong>
                </div>
                <div style="
                  padding-left: 2rem;
                  color: ${textColor};
                  font-size: 0.875rem;
                  line-height: 1.6;
                ">${stepContent}</div>
              </div>`;
          } else if (part.trim()) {
            stepsHTML += `<div style="margin: 0.5rem 0; color: ${textColor}; font-size: 0.875rem; line-height: 1.6;">${part.trim()}</div>`;
          }
        });
        
        if (stepsHTML) {
          processedContent = stepsHTML;
        }
      }
      
      // Clean emoji
      let cleanEmoji = section.emoji.replace(/[♦◆�]/g, '').trim();
      const cleanTitle = section.title.replace(/[♦◆�]/g, '').trim();
      
      html += `
        <div style="
          margin: 0.875rem 0;
          padding: 0.875rem 0.625rem;
          background: ${bgColor};
          border-left: 4px solid ${borderColor};
          border-radius: 10px;
          box-shadow: 0 2px 8px ${shadowColor};
          transition: all 0.3s ease;
        ">
          <div style="
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.625rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid ${borderColor}20;
          ">
            ${cleanEmoji ? `<span style="font-size: 1.35rem; line-height: 1; flex-shrink: 0;">${cleanEmoji}</span>` : ''}
            <strong style="
              color: ${titleColor};
              font-size: 0.85rem;
              font-weight: 700;
              letter-spacing: 0.3px;
              text-transform: uppercase;
              line-height: 1.3;
            ">${cleanTitle}</strong>
          </div>
          <div style="
            color: ${textColor};
            font-size: 0.875rem;
            line-height: 1.65;
            font-weight: 500;
            word-wrap: break-word;
            overflow-wrap: break-word;
          ">${processedContent}</div>
        </div>`;
    });
    
    // Final cleanup
    for (let i = 0; i < 3; i++) {
      html = html
        .replace(/[♦◆�]/g, '')
        .replace(/[\u2666\u25C6\uFFFD]/g, '')
        .replace(/[♦◆�][\s]*</g, '<')
        .replace(/>[\s]*[♦◆�]/g, '>');
    }
    
    console.log('✅ FORMATTING - DONE');
    console.log('📊 Final HTML length:', html.length);
    return html;
  }

  /**
   * Check if current alternative provider is Gemini (show save button)
   */
  isGeminiProvider(): boolean {
    return this.currentAlternativeProvider === 'gemini';
  }

  /**
   * Check if current alternative provider is Groq or HuggingFace (show like button only)
   */
  isOtherProvider(): boolean {
    return this.currentAlternativeProvider === 'groq' || this.currentAlternativeProvider === 'huggingface';
  }
  
  /**
   * Get current variety type for display
   */
  getCurrentAnalogyType(): string {
    const varietyTypes = [
      '🍳 Cooking Analogy',
      '📋 Step-by-Step Tutorial',
      '📊 Visual Diagram',
      '📖 Real-World Story',
      '💻 Code Deep Dive',
      '🧒 ELI5 (Simple)',
      '🎤 Interview Answer',
      '⚠️ Common Mistakes',
      '⚖️ Comparison',
      '⚽ Sports Analogy',
      '🎬 Movie Analogy',
      '🏠 Building Analogy'
    ];
    
    if (this.regenerationCount === 0) return '';
    return varietyTypes[(this.regenerationCount - 1) % varietyTypes.length];
  }

  /**
   * Toggle like for alternative answer (Groq/HuggingFace)
   */
  toggleAlternativeAnswerLike(): void {
    if (!this.currentQuestionId || !this.alternativeAIExplanation) {
      console.warn('❌ Cannot save: missing question ID or alternative explanation');
      return;
    }

    this.alternativeAnswerLiked = !this.alternativeAnswerLiked;
    
    if (this.alternativeAnswerLiked) {
      console.log(`👍 Liked alternative answer from ${this.currentAlternativeProvider.toUpperCase()} - saving to database...`);
      
      // Save the alternative answer to database with 5 stars
      // This will REPLACE any existing answer and load instantly next time!
      this.aiLearnService.saveAnswerRating(
        this.currentQuestionId,
        this.currentQuestionForAlternative?.question || this.modalQuestion,
        this.modalCategory,
        this.alternativeAIExplanation, // Save the alternative (simpler) version!
        5 // High rating so it loads instantly next time
      );

      this.currentAnswerRating = 5;
      this.answerIsFromDB = true;
      this.alternativeAnswerSaved = true;
      
      // Update the main answer with the alternative one for immediate display
      this.aiExplanation = this.alternativeAIExplanation;
      this.modalAnswer = this.alternativeAIExplanation;
      this.userLikedAnswer = true;
      
      console.log('💾 Alternative answer saved! Will load instantly next time you open this question.');
      console.log('🎉 This version will be shown instead of making new API calls!');
    } else {
      console.log('👎 Unlike - answer remains saved in database');
      // Note: We keep the answer in database even when unliked
      // User can regenerate if they want a different version
    }
  }

  // ========================================================================
  // SPLIT-SCREEN "LEARN WITH AI" (Desktop)
  // ========================================================================

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showSplitScreen) this.closeSplitScreen();
  }

  openSplitScreen(question: any): void {
    this.splitQuestion = question;
    this.splitCurrentTopicName = `${question.category} — ${question.question.substring(0, 60)}`;
    this.splitStreamingText = '';
    this.splitAiExplanation = '';
    this.splitIsStreaming = false;
    this.splitAiError = false;
    this.splitFollowUpHistory = [];
    this.splitFollowUpQuestion = '';
    this.splitNoteSaved = false;
    this.splitDuplicateDialogMode = null;
    this.splitDuplicateMatchedNote = null;
    this.splitPendingSaveContent = '';
    // Flow diagram reset
    this.splitFlowMode = false;
    this.splitFlowDiagram = null;
    this.splitIsLoadingFlow = false;
    this.splitFlowError = false;
    this.splitIsFlowConcept = this.detectFlowConcept(question.question);
    this.showSplitScreen = true;
    // Scroll to top of question list so mentor panel is visible
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Start streaming immediately
    this.streamForSplitScreen(question.question);
  }

  closeSplitScreen(): void {
    this.splitStreamSub?.unsubscribe();
    this.showSplitScreen = false;
    this.splitQuestion = null;
    this.splitStreamingText = '';
    this.splitAiExplanation = '';
    this.splitIsStreaming = false;
    this.splitFollowUpHistory = [];
    this.splitDuplicateDialogMode = null;
    this.splitFlowMode = false;
    this.splitIsFlowConcept = false;
    this.splitFlowDiagram = null;
    this.splitIsLoadingFlow = false;
    if (this.splitNoteSavedTimer) clearTimeout(this.splitNoteSavedTimer);
  }

  streamForSplitScreen(prompt: string): void {
    this.splitStreamSub?.unsubscribe();
    this.splitStreamingText = '';
    this.splitAiExplanation = '';
    this.splitIsStreaming = true;
    this.splitAiError = false;
    this.cdr.detectChanges();

    const fullPrompt = `You are an expert software engineer and interview coach.
Explain the following interview question in a structured way with:
1. Core concept and definition
2. Real-world example or analogy
3. Code example (if applicable, in a fenced code block)
4. Common pitfalls / best practices
5. One follow-up interview question to test deeper understanding

Question: ${prompt}`;

    this.splitStreamSub = this.aiStreamingService
      .streamExplanation(fullPrompt, this.selectedModel)
      .subscribe({
        next: (chunk) => {
          if (chunk.error) {
            this.splitAiError = true;
            this.splitIsStreaming = false;
            this.cdr.detectChanges();
            return;
          }
          if (!chunk.done) {
            this.splitStreamingText += chunk.token ?? '';
            this.cdr.detectChanges();
          } else {
            // Streaming complete
            const raw = this.stripLeadingTitle(this.cleanMarkdownCodeFences(this.splitStreamingText), this.splitQuestion?.question || '');
            this.splitAiExplanation = raw;
            this.splitStreamingText = '';
            this.splitIsStreaming = false;
            this.cdr.detectChanges();
          }
        },
        error: () => {
          this.splitAiError = true;
          this.splitIsStreaming = false;
          this.cdr.detectChanges();
        }
      });
  }

  regenerateSplitAnswer(): void {
    if (!this.splitQuestion) return;
    this.splitFollowUpHistory = [];
    this.splitNoteSaved = false;
    this.streamForSplitScreen(this.splitQuestion.question);
  }

  sendSplitFollowUp(): void {
    const q = this.splitFollowUpQuestion.trim();
    if (!q || this.splitIsStreaming) return;
    this.splitFollowUpQuestion = '';
    const context = `In context of "${this.splitQuestion?.question || ''}"`;
    const followUpPrompt = `${context}:
Previous explanation:
${this.splitAiExplanation}

Follow-up question: ${q}
Please answer concisely and clearly.`;

    this.splitFollowUpHistory.push({ role: 'user', content: q });
    this.splitAiExplanation = '';
    this.streamForSplitScreen(followUpPrompt);
  }

  saveSplitNote(): void {
    const content = this.splitAiExplanation;
    if (!content) return;
    const topicTitle = this.splitQuestion?.question?.substring(0, 80) || 'Interview Q&A';

    // Check exact duplicate
    const exact = this.notesService.findExactDuplicate(topicTitle, content);
    if (exact) {
      this.splitDuplicateMatchedNote = exact;
      this.splitDuplicateDialogMode = 'exact';
      this.splitPendingSaveContent = content;
      return;
    }

    // Check similar notes
    const similar = this.notesService.findSimilarNotes(topicTitle);
    if (similar.length > 0) {
      this.splitDuplicateMatchedNote = similar[0];
      this.splitDuplicateDialogMode = 'similar';
      this.splitPendingSaveContent = content;
      return;
    }

    this.performSplitSave(topicTitle, content);
  }

  private async performSplitSave(title: string, content: string): Promise<void> {
    this.splitIsSavingNote = true;
    this.cdr.detectChanges();
    try {
      await this.notesService.saveNote(title, content);
      this.splitIsSavingNote = false;
      this.splitNoteSaved = true;
      this.splitDuplicateDialogMode = null;
      if (this.splitNoteSavedTimer) clearTimeout(this.splitNoteSavedTimer);
      this.splitNoteSavedTimer = setTimeout(() => { this.splitNoteSaved = false; this.cdr.detectChanges(); }, 3000);
    } catch {
      this.splitIsSavingNote = false;
    }
    this.cdr.detectChanges();
  }

  onSplitDuplicateSaveNew(): void {
    const title = this.splitQuestion?.question?.substring(0, 80) || 'Interview Q&A';
    this.performSplitSave(title, this.splitPendingSaveContent);
  }

  onSplitDuplicateUpdate(): void {
    if (!this.splitDuplicateMatchedNote?.id) return;
    const id = this.splitDuplicateMatchedNote.id;
    const content = this.splitPendingSaveContent;
    this.splitIsSavingNote = true;
    this.cdr.detectChanges();
    this.notesService.updateNote(id, content).then(() => {
      this.splitIsSavingNote = false;
      this.splitNoteSaved = true;
      this.splitDuplicateDialogMode = null;
      if (this.splitNoteSavedTimer) clearTimeout(this.splitNoteSavedTimer);
      this.splitNoteSavedTimer = setTimeout(() => { this.splitNoteSaved = false; this.cdr.detectChanges(); }, 3000);
      this.cdr.detectChanges();
    }).catch(() => { this.splitIsSavingNote = false; this.cdr.detectChanges(); });
  }

  onSplitDuplicateMerge(): void {
    if (!this.splitDuplicateMatchedNote?.id) return;
    const id = this.splitDuplicateMatchedNote.id;
    this.splitIsSavingNote = true;
    this.cdr.detectChanges();
    this.notesService.mergeNote(id, this.splitPendingSaveContent).then(() => {
      this.splitIsSavingNote = false;
      this.splitNoteSaved = true;
      this.splitDuplicateDialogMode = null;
      if (this.splitNoteSavedTimer) clearTimeout(this.splitNoteSavedTimer);
      this.splitNoteSavedTimer = setTimeout(() => { this.splitNoteSaved = false; this.cdr.detectChanges(); }, 3000);
      this.cdr.detectChanges();
    }).catch(() => { this.splitIsSavingNote = false; this.cdr.detectChanges(); });
  }

  closeSplitDuplicateDialog(): void {
    this.splitDuplicateDialogMode = null;
    this.splitDuplicateMatchedNote = null;
    this.splitPendingSaveContent = '';
  }

  navigateToNotes(): void {
    this.router.navigate(['/notes']);
  }

  // ========================================================================
  // VISUAL FLOW ANIMATION MODE
  // ========================================================================

  /** Returns true when the question text contains flow/process keywords */
  detectFlowConcept(question: string): boolean {
    const q = (question || '').toLowerCase();
    return this.flowKeywords.some(kw => q.includes(kw));
  }

  /** Toggle between text explanation and flow diagram */
  toggleSplitFlowMode(): void {
    if (this.splitFlowMode) {
      this.splitFlowMode = false;
      return;
    }
    if (this.splitFlowDiagram) {
      // Already generated — just switch view
      this.splitFlowMode = true;
    } else {
      this.generateSplitFlowDiagram();
    }
  }

  /** Ask the AI to produce a JSON flow diagram and parse it */
  generateSplitFlowDiagram(): void {
    if (!this.splitQuestion) return;
    this.splitIsLoadingFlow = true;
    this.splitFlowError = false;
    this.splitFlowMode = true;           // switch to flow view immediately (show loader)
    this.splitFlowDiagram = null;
    this.cdr.detectChanges();

    const prompt =
`You are a technical educator. Break down the following concept into a visual step-by-step flow.

Concept: "${this.splitQuestion.question}"

Respond with ONLY valid JSON — no markdown fences, no extra text. Schema:
{
  "title": "Short title (max 5 words)",
  "subtitle": "One sentence describing this flow",
  "steps": [
    {
      "icon": "single emoji",
      "title": "Step name (2-4 words)",
      "description": "What happens here (max 18 words)",
      "connectorLabel": "optional transition word (e.g. triggers, returns, sends)"
    }
  ]
}

Rules:
- 4 to 7 steps total
- Each icon must be a single relevant emoji
- connectorLabel is optional — only include when it adds clarity
- Keep descriptions short, concrete, and jargon-free
- Output ONLY the JSON object, nothing else`;

    this.aiLearnService.getSimplifiedExplanation(prompt).subscribe({
      next: (response) => {
        this.splitIsLoadingFlow = false;
        if (response.success && response.explanation) {
          try {
            const raw = response.explanation.trim();
            // Extract JSON even if wrapped in stray text
            const match = raw.match(/\{[\s\S]*\}/);
            if (!match) throw new Error('No JSON found');
            const parsed: FlowDiagram = JSON.parse(match[0]);
            if (!parsed.steps || parsed.steps.length < 2) throw new Error('Too few steps');
            this.splitFlowDiagram = parsed;
          } catch (e) {
            console.error('Flow parse error:', e);
            this.splitFlowError = true;
          }
        } else {
          this.splitFlowError = true;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.splitIsLoadingFlow = false;
        this.splitFlowError = true;
        this.cdr.detectChanges();
      }
    });
  }
}
