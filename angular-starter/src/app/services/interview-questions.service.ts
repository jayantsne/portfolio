import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface InterviewQuestion {
  id: number;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  dateAdded?: Date;
  expanded?: boolean;
  timestamp?: Date;
  saved?: boolean;
  isLearning?: boolean;
}

export interface QuestionPrompt {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface QuestionPromptsResponse {
  questionId: number;
  question: string;
  category: string;
  difficulty: string;
  prompts: QuestionPrompt[];
}

export interface LearnWithAIRequest {
  questionId: number;
  promptId: string;
}

export interface LearnWithAIResponse {
  questionId: number;
  promptId: string;
  promptTitle: string;
  response: string;  // Contains systemPrompt + userPromptTemplate
  tokensUsed: number;
  responseTimeMs: number;
  model: string;
}

export interface QuestionsResponse {
  questions: InterviewQuestion[];
  total: number;
  categoryCount: { [key: string]: number };
}

@Injectable({
  providedIn: 'root'
})
export class InterviewQuestionsService {
  // Update this to match your .NET API URL
  private apiUrl = environment.apiUrl || 'https://localhost:5001/api';
  
  // Cache for questions
  private questionsCache$ = new BehaviorSubject<InterviewQuestion[]>([]);
  private isLoading$ = new BehaviorSubject<boolean>(false);
  private error$ = new BehaviorSubject<string | null>(null);

  constructor(private http: HttpClient) {}

  /**
   * Get HTTP headers with API key
   */
  private getHeaders() {
    return {
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }

  /**
   * Get all interview questions from MongoDB
   */
  getAllQuestions(): Observable<QuestionsResponse> {
    this.isLoading$.next(true);
    this.error$.next(null);

    return this.http.get<QuestionsResponse>(`${this.apiUrl}/questions`, this.getHeaders()).pipe(
      tap(response => {
        // Add client-side properties
        const enrichedQuestions = response.questions.map(q => ({
          ...q,
          timestamp: new Date(),
          saved: false,
          expanded: false,
          isLearning: false
        }));
        this.questionsCache$.next(enrichedQuestions);
        this.isLoading$.next(false);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Get a single question by ID
   */
  getQuestionById(id: number): Observable<InterviewQuestion> {
    return this.http.get<InterviewQuestion>(`${this.apiUrl}/questions/${id}`).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Create a new question
   */
  createQuestion(question: Partial<InterviewQuestion>): Observable<InterviewQuestion> {
    return this.http.post<InterviewQuestion>(`${this.apiUrl}/questions`, question).pipe(
      tap(() => this.invalidateCache()),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Update an existing question
   */
  updateQuestion(id: number, question: Partial<InterviewQuestion>): Observable<InterviewQuestion> {
    return this.http.put<InterviewQuestion>(`${this.apiUrl}/questions/${id}`, question).pipe(
      tap(() => this.invalidateCache()),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Delete a question
   */
  deleteQuestion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/questions/${id}`).pipe(
      tap(() => this.invalidateCache()),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Bulk create questions (useful for seeding)
   */
  bulkCreateQuestions(questions: Partial<InterviewQuestion>[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/questions/bulk`, { questions }).pipe(
      tap(() => this.invalidateCache()),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Get cached questions (for immediate UI display)
   */
  getCachedQuestions(): Observable<InterviewQuestion[]> {
    return this.questionsCache$.asObservable();
  }

  /**
   * Get loading state
   */
  getLoadingState(): Observable<boolean> {
    return this.isLoading$.asObservable();
  }

  /**
   * Get error state
   */
  getErrorState(): Observable<string | null> {
    return this.error$.asObservable();
  }

  /**
   * Invalidate cache and force refresh
   */
  invalidateCache(): void {
    this.questionsCache$.next([]);
  }

  /**
   * Search questions by text
   */
  searchQuestions(searchTerm: string, category?: string): Observable<InterviewQuestion[]> {
    return this.getCachedQuestions().pipe(
      map(questions => {
        return questions.filter(q => {
          const matchesCategory = !category || category === 'all' || q.category === category;
          const matchesSearch = !searchTerm || 
            q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
          return matchesCategory && matchesSearch;
        });
      })
    );
  }

  /**
   * Get questions by category
   */
  getQuestionsByCategory(category: string): Observable<InterviewQuestion[]> {
    return this.getCachedQuestions().pipe(
      map(questions => {
        if (category === 'all') return questions;
        return questions.filter(q => q.category === category);
      })
    );
  }

  /**
   * Get questions by difficulty
   */
  getQuestionsByDifficulty(difficulty: string): Observable<InterviewQuestion[]> {
    return this.getCachedQuestions().pipe(
      map(questions => questions.filter(q => q.difficulty === difficulty))
    );
  }

  /**
   * Get unique categories
   */
  getCategories(): Observable<string[]> {
    return this.getCachedQuestions().pipe(
      map(questions => {
        const categories = new Set(questions.map(q => q.category));
        return Array.from(categories).sort();
      })
    );
  }

  /**
   * Get statistics
   */
  getStatistics(): Observable<any> {
    return this.getCachedQuestions().pipe(
      map(questions => {
        const categories = questions.reduce((acc: any, q) => {
          acc[q.category] = (acc[q.category] || 0) + 1;
          return acc;
        }, {});

        const difficulties = questions.reduce((acc: any, q) => {
          acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
          return acc;
        }, {});

        return {
          total: questions.length,
          categories,
          difficulties,
          totalCategories: Object.keys(categories).length
        };
      })
    );
  }

  /**
   * Get available prompts for a question
   */
  getQuestionPrompts(questionId: number): Observable<QuestionPromptsResponse> {
    return this.http.get<QuestionPromptsResponse>(
      `${this.apiUrl}/questions/${questionId}/prompts`,
      this.getHeaders()
    ).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Get AI learning prompt details
   */
  getAIPromptDetails(questionId: number, promptId: string): Observable<LearnWithAIResponse> {
    const request: LearnWithAIRequest = { questionId, promptId };
    return this.http.post<LearnWithAIResponse>(
      `${this.apiUrl}/questions/${questionId}/learn`,
      request,
      this.getHeaders()
    ).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred while fetching interview questions';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Server Error: ${error.status} - ${error.message}`;
      
      if (error.status === 0) {
        errorMessage = 'Unable to connect to the server. Please check if the API is running.';
      } else if (error.status === 404) {
        errorMessage = 'Questions endpoint not found. Please check the API URL.';
      } else if (error.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
    }

    console.error('Interview Questions Service Error:', error);
    this.error$.next(errorMessage);
    this.isLoading$.next(false);
    
    return throwError(() => new Error(errorMessage));
  }
}
