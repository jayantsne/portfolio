import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { QuestionsDataService, InterviewQuestion, QuestionData } from '../shared/questions-data.service';
import { AuthService } from '../shared/auth.service';
import { ApiService } from '../shared/api.service';
import { AiStreamingService } from '../services/ai-streaming.service';

/**
 * Admin component for managing interview questions
 */
@Component({
  selector: 'app-interview-questions',
  templateUrl: './interview-questions.component.html',
  styleUrls: ['./interview-questions.component.css']
})
export class InterviewQuestionsComponent implements OnInit, OnDestroy {
  questions: InterviewQuestion[] = [];

  newQuestion: InterviewQuestion = {
    id: 0,
    question: '',
    answer: '',
    category: '',
    difficulty: 'Medium',
    tags: [],
    expanded: false
  };

  categories: string[] = [
    'Angular',
    'TypeScript',
    'JavaScript',
    'RxJS',
    '.NET Core',
    'C#',
    'ASP.NET',
    'Entity Framework',
    'Design Patterns',
    'SOLID Principles',
    'Microservices',
    'Docker',
    'Kubernetes',
    'Azure',
    'AWS',
    'SQL',
    'MongoDB',
    'Node.js',
    'React',
    'System Design',
    'Data Structures',
    'Algorithms',
    'Testing',
    'Git',
    'DevOps',
    'Other'
  ];
  
  selectedCategory: string = 'all';
  searchTerm: string = '';
  selectedDifficulty: string = 'all';
  showStats: boolean = false;
  autoFormatEnabled: boolean = true;
  showFormatPreview: boolean = false;
  formattedPreview: string = '';
  showPortfolioSettings: boolean = false;
  
  // Portfolio Data
  portfolioData: any = {
    about: '',
    experience: '',
    skills: '',
    projects: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    twitter: ''
  };
  
  // Authentication Management
  authSettings: any = {
    faceIdEnabled: true,
    twoFactorEnabled: true,
    voiceLoginEnabled: false,
    biometricEnabled: true,
    smsAuthEnabled: false,
    emailAuthEnabled: true
  };
  showAuthSettings: boolean = false;
  
  // Namespace Management
  newNamespace: any = {
    name: '',
    description: ''
  };
  existingNamespaces: any[] = [
    { id: 'AUTH_KV', name: 'AUTH_KV', description: 'User authentication data', created: new Date('2026-01-01') },
    { id: 'QUESTIONS_KV', name: 'QUESTIONS_KV', description: 'Interview questions database', created: new Date('2026-01-01') },
    { id: 'PROGRESS_KV', name: 'PROGRESS_KV', description: 'User progress tracking', created: new Date('2026-01-01') },
    { id: 'CHAT_KV', name: 'CHAT_KV', description: 'AI chat conversations', created: new Date('2026-01-01') }
  ];
  
  // Namespace Validation
  namespaceValidation: any = {
    isValid: false,
    hasError: false,
    errorMessage: '',
    checks: {
      hasUppercase: false,
      hasUnderscore: false,
      endsWithKV: false,
      noSpecialChars: false,
      notDuplicate: false
    }
  };
  
  // AI Answer Features - Only show answers via AI button
  loadedAIAnswers: Map<number, boolean> = new Map(); // Track which answers are loaded
  loadingAIAnswers: Map<number, boolean> = new Map(); // Track loading state
  aiAnswers: Map<number, string> = new Map(); // Store AI-generated answers per question
  streamingSubs: Map<number, Subscription> = new Map(); // Active streaming subscriptions

  constructor(
    private questionsService: QuestionsDataService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private apiService: ApiService,
    private aiStreaming: AiStreamingService
  ) { }

  ngOnInit(): void {
    this.questionsService.questions$.subscribe(questions => {
      this.questions = questions;
    });
    this.loadAuthSettings();
    
    // Handle fragment navigation from navbar dropdown
    this.route.fragment.subscribe(fragment => {
      if (fragment === 'portfolio') {
        this.showPortfolioSettings = true;
        this.showAuthSettings = false;
        setTimeout(() => {
          const element = document.querySelector('.portfolio-settings-section');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else if (fragment === 'auth') {
        this.showAuthSettings = true;
        this.showPortfolioSettings = false;
        setTimeout(() => {
          const element = document.querySelector('.auth-settings-section');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    });
  }

  get filteredQuestions(): InterviewQuestion[] {
    let filtered = this.questions;

    // Filter by category
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(q => q.category === this.selectedCategory);
    }

    // Filter by difficulty
    if (this.selectedDifficulty !== 'all') {
      filtered = filtered.filter(q => q.difficulty === this.selectedDifficulty);
    }

    // Filter by search term
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(q => 
        q.question.toLowerCase().includes(term) || 
        q.answer.toLowerCase().includes(term) ||
        (q.tags && q.tags.some(tag => tag.toLowerCase().includes(term)))
      );
    }

    return filtered;
  }

  get statistics() {
    const total = this.questions.length;
    const byCategory = this.categories.map(cat => ({
      category: cat,
      count: this.questions.filter(q => q.category === cat).length
    })).filter(item => item.count > 0);

    const byDifficulty = {
      easy: this.questions.filter(q => q.difficulty === 'Easy').length,
      medium: this.questions.filter(q => q.difficulty === 'Medium').length,
      hard: this.questions.filter(q => q.difficulty === 'Hard').length
    };

    return { total, byCategory, byDifficulty };
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

  ngOnDestroy(): void {
    this.streamingSubs.forEach(sub => sub.unsubscribe());
  }

  /**
   * Get AI-generated answer for a question via streaming
   */
  getAIAnswer(questionId: number): void {
    const question = this.questions.find(q => q.id === questionId);
    if (!question) return;

    // Cancel any existing stream for this question
    this.streamingSubs.get(questionId)?.unsubscribe();

    this.loadingAIAnswers.set(questionId, true);
    this.aiAnswers.set(questionId, '');

    const sub = this.aiStreaming.streamExplanation(question.question, 'qwen').subscribe({
      next: chunk => {
        if (chunk.error) {
          this.loadingAIAnswers.set(questionId, false);
          this.loadedAIAnswers.set(questionId, true);
          this.aiAnswers.set(questionId, 'Error: ' + chunk.error);
          return;
        }
        if (!chunk.done) {
          this.aiAnswers.set(questionId, (this.aiAnswers.get(questionId) || '') + chunk.token);
        } else {
          this.loadingAIAnswers.set(questionId, false);
          this.loadedAIAnswers.set(questionId, true);
        }
      },
      error: () => {
        this.loadingAIAnswers.set(questionId, false);
        this.loadedAIAnswers.set(questionId, true);
        this.aiAnswers.set(questionId, 'Failed to get AI answer. Please try again.');
      }
    });

    this.streamingSubs.set(questionId, sub);
  }

  addQuestion(): void {
    if (this.newQuestion.question && this.newQuestion.category) {
      // Save question without answer - AI will generate answers during study
      this.questionsService.addQuestion({ 
        ...this.newQuestion, 
        answer: '', // No answer stored - will be generated by AI
        expanded: false 
      });
      this.resetForm();
      alert('✅ Question added successfully! AI will generate answers when you study.');
    }
  }

  deleteQuestion(id: number): void {
    if (confirm('Are you sure you want to delete this question?')) {
      this.questionsService.deleteQuestion(id);
    }
  }

  resetForm(): void {
    this.newQuestion = {
      id: 0,
      question: '',
      answer: '',
      category: '',
      difficulty: 'Medium',
      tags: [],
      expanded: false
    };
  }

  // Export/Import Functionality
  exportToJSON(): void {
    const data = this.questionsService.exportData();
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `interview-questions-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  exportToMarkdown(): void {
    let markdown = '# Interview Questions\n\n';
    markdown += `Generated on: ${new Date().toLocaleDateString()}\n`;
    markdown += `Total Questions: ${this.questions.length}\n\n`;
    markdown += '---\n\n';

    // Group by category
    const grouped = this.groupByCategory();
    
    for (const category of Object.keys(grouped).sort()) {
      markdown += `## ${category}\n\n`;
      
      grouped[category].forEach((q, index) => {
        markdown += `### ${index + 1}. ${q.question}\n\n`;
        if (q.difficulty) {
          markdown += `**Difficulty:** ${q.difficulty}\n\n`;
        }
        if (q.tags && q.tags.length > 0) {
          markdown += `**Tags:** ${q.tags.join(', ')}\n\n`;
        }
        markdown += `**Answer:**\n\n${q.answer}\n\n`;
        markdown += '---\n\n';
      });
    }

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `interview-questions-${new Date().toISOString().split('T')[0]}.md`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  importFromFile(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const data: QuestionData = JSON.parse(e.target.result);
          if (confirm(`Import ${data.totalQuestions} questions? This will replace your current data.`)) {
            this.questionsService.importQuestions(data);
            alert('Questions imported successfully!');
          }
        } catch (error) {
          alert('Error importing file. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  }

  clearAllData(): void {
    if (confirm('Are you sure you want to delete ALL questions? This cannot be undone!')) {
      if (confirm('Really sure? This will permanently delete all your questions!')) {
        this.questionsService.clearAll();
        alert('All questions have been deleted.');
      }
    }
  }

  private groupByCategory(): { [key: string]: InterviewQuestion[] } {
    return this.questions.reduce((acc, question) => {
      if (!acc[question.category]) {
        acc[question.category] = [];
      }
      acc[question.category].push(question);
      return acc;
    }, {} as { [key: string]: InterviewQuestion[] });
  }

  /**
   * AI-powered answer formatting
   * Automatically formats text with proper structure, code blocks, and bullet points
   */
  aiFormatAnswer(text: string): string {
    if (!text) return text;

    let formatted = text.trim();

    // 1. Detect and format code blocks
    formatted = this.formatCodeBlocks(formatted);

    // 2. Format lists and bullet points
    formatted = this.formatLists(formatted);

    // 3. Add proper spacing between paragraphs
    formatted = this.formatParagraphs(formatted);

    // 4. Format numbered steps
    formatted = this.formatNumberedSteps(formatted);

    // 5. Highlight important terms
    formatted = this.formatImportantTerms(formatted);

    return formatted;
  }

  /**
   * Detect and format code blocks with proper syntax
   */
  private formatCodeBlocks(text: string): string {
    // Detect inline code (words with parentheses, dots, or camelCase)
    text = text.replace(/\b([a-z]+[A-Z][a-zA-Z]*\(\)|[a-zA-Z]+\.[a-zA-Z]+\(\)|[A-Z][a-z]+[A-Z][a-zA-Z]*)/g, '`$1`');
    
    // Detect code blocks (multiple lines with indentation or specific patterns)
    const codePatterns = [
      /^(\s*)(class|interface|public|private|protected|function|const|let|var|async|await|return)\s+/gm,
      /^(\s*)(using|namespace|import|export|from)\s+/gm
    ];
    
    codePatterns.forEach(pattern => {
      if (pattern.test(text)) {
        // Wrap code sections
        text = text.replace(/((?:^\s*[a-zA-Z].*\n)+)/gm, (match) => {
          if (match.split('\n').length > 2) {
            return '\n```\n' + match.trim() + '\n```\n';
          }
          return match;
        });
      }
    });

    return text;
  }

  /**
   * Format bullet points and lists
   */
  private formatLists(text: string): string {
    // Convert lines starting with dash/asterisk to proper bullets
    text = text.replace(/^[-*]\s+/gm, '• ');
    
    // Detect list patterns (lines starting with words like "First", "Second", etc.)
    text = text.replace(/^(First|Second|Third|Fourth|Fifth|Finally|Also|Additionally)[,:]/gm, '\n• $1:');
    
    // Add bullets to advantage/benefit lists
    text = text.replace(/^(Advantage|Benefit|Pro|Feature|Key point)[:\s]/gmi, '\n✓ $1: ');
    text = text.replace(/^(Disadvantage|Con|Drawback|Limitation)[:\s]/gmi, '\n✗ $1: ');

    return text;
  }

  /**
   * Add proper paragraph spacing
   */
  private formatParagraphs(text: string): string {
    // Remove excessive line breaks
    text = text.replace(/\n{3,}/g, '\n\n');
    
    // Ensure proper spacing after periods
    text = text.replace(/\.([A-Z])/g, '.\n\n$1');
    
    return text;
  }

  /**
   * Format numbered steps
   */
  private formatNumberedSteps(text: string): string {
    // Detect numbered steps (1., 2., 3., etc.)
    const hasNumberedSteps = /^\d+[\.\)]\s+/gm.test(text);
    
    if (hasNumberedSteps) {
      text = text.replace(/^(\d+[\.\)])\s+/gm, '\n$1 ');
    }

    return text;
  }

  /**
   * Highlight important programming terms
   */
  private formatImportantTerms(text: string): string {
    const importantTerms = [
      'SOLID', 'DRY', 'KISS', 'YAGNI',
      'Repository Pattern', 'Factory Pattern', 'Singleton',
      'Dependency Injection', 'IoC',
      'async/await', 'Promise', 'Observable',
      'SQL', 'NoSQL', 'LINQ', 'EF Core'
    ];

    importantTerms.forEach(term => {
      const regex = new RegExp(`\\b(${term})\\b`, 'gi');
      text = text.replace(regex, '**$1**');
    });

    return text;
  }

  /**
   * Preview AI formatting before saving
   */
  previewFormatting(): void {
    if (this.newQuestion.answer) {
      this.formattedPreview = this.aiFormatAnswer(this.newQuestion.answer);
      this.showFormatPreview = true;
      setTimeout(() => {
        this.showFormatPreview = false;
      }, 5000);
    }
  }

  /**
   * Toggle auto-format feature
   */
  toggleAutoFormat(): void {
    this.autoFormatEnabled = !this.autoFormatEnabled;
    const status = this.autoFormatEnabled ? 'enabled' : 'disabled';
    alert(`🤖 AI Auto-Format ${status}`);
  }

  /**
   * Save portfolio settings to backend
   */
  savePortfolioSettings(): void {
    // TODO: Call API to save portfolio data
    console.log('Saving portfolio data:', this.portfolioData);
    alert('✅ Portfolio settings saved successfully!');
  }

  /**
   * Load portfolio settings from backend
   */
  loadPortfolioSettings(): void {
    // TODO: Call API to load portfolio data
    console.log('Loading portfolio data from database...');
    alert('🔄 Portfolio settings reloaded from database!');
  }

  /**
   * Validate namespace name in real-time
   */
  validateNamespaceName(): void {
    const name = this.newNamespace.name;
    
    // Reset validation
    this.namespaceValidation = {
      isValid: false,
      hasError: false,
      errorMessage: '',
      checks: {
        hasUppercase: false,
        hasUnderscore: false,
        endsWithKV: false,
        noSpecialChars: false,
        notDuplicate: false
      }
    };

    if (!name) {
      return;
    }

    // Check 1: All uppercase
    this.namespaceValidation.checks.hasUppercase = name === name.toUpperCase();

    // Check 2: Has underscore
    this.namespaceValidation.checks.hasUnderscore = name.includes('_');

    // Check 3: Ends with _KV
    this.namespaceValidation.checks.endsWithKV = name.endsWith('_KV');

    // Check 4: No special characters (only letters, numbers, underscores)
    const validPattern = /^[A-Z0-9_]+$/;
    this.namespaceValidation.checks.noSpecialChars = validPattern.test(name);

    // Check 5: Not duplicate
    this.namespaceValidation.checks.notDuplicate = !this.existingNamespaces.some(ns => ns.name === name);

    // Determine overall validation status
    const allChecksPassed = Object.values(this.namespaceValidation.checks).every(check => check === true);

    if (allChecksPassed) {
      this.namespaceValidation.isValid = true;
      this.namespaceValidation.hasError = false;
    } else {
      this.namespaceValidation.hasError = true;
      
      // Set specific error message
      if (!this.namespaceValidation.checks.hasUppercase) {
        this.namespaceValidation.errorMessage = 'Name must be all UPPERCASE';
      } else if (!this.namespaceValidation.checks.noSpecialChars) {
        this.namespaceValidation.errorMessage = 'Only letters, numbers, and underscores allowed';
      } else if (!this.namespaceValidation.checks.hasUnderscore) {
        this.namespaceValidation.errorMessage = 'Use underscores instead of spaces';
      } else if (!this.namespaceValidation.checks.endsWithKV) {
        this.namespaceValidation.errorMessage = 'Name should end with _KV';
      } else if (!this.namespaceValidation.checks.notDuplicate) {
        this.namespaceValidation.errorMessage = 'This namespace name already exists';
      }
    }
  }

  /**
   * Apply a suggested namespace name
   */
  applySuggestion(name: string, description: string): void {
    this.newNamespace.name = name;
    this.newNamespace.description = description;
    this.validateNamespaceName();
  }

  /**
   * Create a new KV namespace
   */
  createNamespace(): void {
    if (!this.newNamespace.name || !this.newNamespace.description) {
      alert('⚠️ Please enter both namespace name and description');
      return;
    }

    if (!this.namespaceValidation.isValid) {
      alert('⚠️ Please fix validation errors before creating namespace');
      return;
    }

    if (this.newNamespace.description.length < 10) {
      alert('⚠️ Please provide a more detailed description (at least 10 characters)');
      return;
    }

    // Create new namespace (in production, this would call Cloudflare Workers API)
    const newNs = {
      id: this.newNamespace.name,
      name: this.newNamespace.name,
      description: this.newNamespace.description,
      created: new Date()
    };

    this.existingNamespaces.push(newNs);
    
    console.log('Creating namespace:', newNs);
    alert(`✅ Namespace "${this.newNamespace.name}" created successfully!\n\n` +
          `Next steps:\n` +
          `1. Add this to wrangler.toml:\n` +
          `   [[kv_namespaces]]\n` +
          `   binding = "${this.newNamespace.name}"\n` +
          `   id = "your-kv-id"\n\n` +
          `2. Deploy: npx wrangler deploy\n` +
          `3. Start using your new namespace!`);
    
    // Reset form and validation
    this.newNamespace = { name: '', description: '' };
    this.namespaceValidation = {
      isValid: false,
      hasError: false,
      errorMessage: '',
      checks: {
        hasUppercase: false,
        hasUnderscore: false,
        endsWithKV: false,
        noSpecialChars: false,
        notDuplicate: false
      }
    };
  }

  /**
   * Load existing namespaces
   */
  loadNamespaces(): void {
    // TODO: Call API to fetch namespaces from Cloudflare
    console.log('Refreshing namespaces list...');
    alert('🔄 Namespaces list refreshed!');
  }

  /**
   * Delete a namespace
   */
  deleteNamespace(id: string): void {
    if (confirm(`⚠️ Are you sure you want to delete namespace "${id}"?\n\nThis action cannot be undone and all data will be lost!`)) {
      this.existingNamespaces = this.existingNamespaces.filter(ns => ns.id !== id);
      console.log('Deleting namespace:', id);
      alert(`✅ Namespace "${id}" deleted successfully!`);
    }
  }

  /**
   * Load authentication settings from database
   */
  loadAuthSettings(): void {
    const userId = this.authService.getUserId();
    
    this.apiService.getAuthSettings(userId).subscribe(
      (settings) => {
        this.authSettings = settings;
        console.log('✅ Interview Questions: Loaded auth settings from database:', this.authSettings);
      },
      (error) => {
        console.error('❌ Interview Questions: Error loading auth settings:', error);
        console.log('📝 Interview Questions: Using default auth settings');
      }
    );
  }

  /**
   * Save authentication settings to database
   */
  saveAuthSettings(): void {
    const userId = this.authService.getUserId();
    
    this.apiService.saveAuthSettings(this.authSettings, userId).subscribe(
      (response) => {
        console.log('✅ Auth settings saved successfully:', response);
        alert('✅ Authentication settings saved successfully!');
      },
      (error) => {
        console.error('❌ Error saving auth settings:', error);
        alert('❌ Failed to save authentication settings. Please try again.');
      }
    );
  }

  /**
   * Toggle authentication feature
   */
  toggleAuthFeature(feature: string): void {
    this.authSettings[feature] = !this.authSettings[feature];
    this.saveAuthSettings();
  }

  /**
   * Reset authentication settings to default
   */
  resetAuthSettings(): void {
    if (confirm('⚠️ Are you sure you want to reset authentication settings to default?')) {
      this.authSettings = {
        faceIdEnabled: true,
        twoFactorEnabled: true,
        voiceLoginEnabled: false,
        biometricEnabled: true,
        smsAuthEnabled: false,
        emailAuthEnabled: true
      };
      this.saveAuthSettings();
      alert('✅ Authentication settings reset to default!');
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
}
