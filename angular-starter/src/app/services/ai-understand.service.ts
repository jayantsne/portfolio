import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout, retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface UnderstandRequest {
  topicName: string;
  examCode: string;
}

export interface UnderstandResponse {
  topicName: string;
  examCode: string;
  explanation: string;
  promptFound: boolean;
  processingTimeMs: number;
  tokensUsed?: number;
  timestamp: string;
}

export interface ErrorResponse {
  error: string;
  details?: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiUnderstandService {
  private readonly apiUrl = environment.apiUrl || 'https://learnwithai.tech/learn-api';
  
  // Cache for responses (in-memory)
  private cache: Map<string, UnderstandResponse> = new Map();
  
  constructor(private http: HttpClient) {}

  /**
   * Get AI-powered understanding for a topic
   */
  understandTopic(topicName: string, examCode: string = 'AI-102'): Observable<UnderstandResponse> {
    // Check cache first
    const cacheKey = `${examCode}:${topicName}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      console.log('Returning cached response for:', topicName);
      return new Observable(observer => {
        observer.next(cached);
        observer.complete();
      });
    }

    const request: UnderstandRequest = {
      topicName,
      examCode
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    console.log('Fetching AI understanding for:', topicName);

    return this.http.post<UnderstandResponse>(
      `${this.apiUrl}/ai/understand`,
      request,
      { headers }
    ).pipe(
      timeout(30000), // 30 second timeout
      retry(1), // Retry once on failure
      catchError(this.handleError)
    );
  }

  /**
   * Cache a response for future use
   */
  cacheResponse(response: UnderstandResponse): void {
    const cacheKey = `${response.examCode}:${response.topicName}`;
    this.cache.set(cacheKey, response);
    console.log('Cached response for:', response.topicName);
  }

  /**
   * Clear the cache (useful for forcing refresh)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('Cache cleared');
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    let details = '';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = 'Network error occurred';
      details = error.error.message;
    } else {
      // Server-side error
      if (error.status === 0) {
        errorMessage = 'Cannot connect to AI service';
        details = 'Please check your internet connection and try again';
      } else if (error.status === 400) {
        errorMessage = 'Invalid request';
        details = error.error?.details || 'Please check your input';
      } else if (error.status === 401) {
        errorMessage = 'Unauthorized';
        details = 'Invalid API key';
      } else if (error.status === 408) {
        errorMessage = 'Request timeout';
        details = 'AI service took too long to respond. Please try again.';
      } else if (error.status === 429) {
        errorMessage = 'Too many requests';
        details = 'Please wait a moment before trying again';
      } else if (error.status === 503) {
        errorMessage = 'Service unavailable';
        details = error.error?.details || 'AI service is temporarily unavailable';
      } else {
        errorMessage = `Server error (${error.status})`;
        details = error.error?.details || error.message;
      }
    }

    console.error('AI Understand Service Error:', errorMessage, details);
    
    return throwError(() => ({
      error: errorMessage,
      details: details,
      status: error.status
    }));
  }
}
