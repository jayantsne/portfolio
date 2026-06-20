/**
 * API Service
 *
 * This service communicates with the ASP.NET backend API.
 * Data is persisted by the backend.
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Question {
  _id?: string;
  id: number;
  question: string;
  answer: string;
  category: string;
  tags?: string[];
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  dateAdded?: Date;
  expanded?: boolean;
}

export interface QuestionData {
  version: string;
  lastUpdated: string;
  totalQuestions: number;
  questions: Question[];
}

export interface UserProgress {
  _id?: string;
  userId: string;
  bookmarks: number[];
  progress: { [key: string]: number };
  totalTime: number;
  lastVisit: Date;
  visitDates: string[];
}

export interface AuthResponse {
  isAuthenticated: boolean;
}

export interface AIQA {
  _id?: string;
  userId: string;
  question: string;
  answer: string;
  category?: string;
  saved: boolean;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;
  private userId = 'default-user'; // You can make this dynamic based on logged-in user

  constructor(private http: HttpClient) {}

  // ==================== QUESTIONS ====================

  getQuestions(): Observable<QuestionData> {
    return this.http.get<QuestionData>(`${this.apiUrl}/questions`);
  }

  addQuestion(question: Partial<Question>): Observable<Question> {
    return this.http.post<Question>(`${this.apiUrl}/questions`, question);
  }

  updateQuestion(id: number, question: Partial<Question>): Observable<Question> {
    return this.http.put<Question>(`${this.apiUrl}/questions/${id}`, question);
  }

  deleteQuestion(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/questions/${id}`);
  }

  clearAllQuestions(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/questions`);
  }

  importQuestions(data: { questions: Question[] }): Observable<any> {
    return this.http.post(`${this.apiUrl}/questions/import`, data);
  }

  // ==================== USER PROGRESS ====================

  getUserProgress(userId?: string): Observable<UserProgress> {
    const uid = userId || this.userId;
    return this.http.get<UserProgress>(`${this.apiUrl}/user-progress/${uid}`);
  }

  updateUserProgress(progress: Partial<UserProgress>, userId?: string): Observable<UserProgress> {
    const uid = userId || this.userId;
    return this.http.put<UserProgress>(`${this.apiUrl}/user-progress/${uid}`, progress);
  }

  // ==================== AUTH ====================

  checkAuth(userId?: string): Observable<AuthResponse> {
    const uid = userId || this.userId;
    return this.http.get<AuthResponse>(`${this.apiUrl}/auth/${uid}`);
  }

  login(username: string, password: string): Observable<any> {
    // Backend LoginDto expects { email, password } — map the username field to email
    return this.http.post(`${this.apiUrl}/auth/login`, { email: username, password });
  }

  logout(userId?: string): Observable<any> {
    const uid = userId || this.userId;
    return this.http.post(`${this.apiUrl}/auth/logout`, { userId: uid });
  }

  // ==================== AI Q&A ====================

  getAIQAs(userId?: string): Observable<AIQA[]> {
    const uid = userId || this.userId;
    return this.http.get<AIQA[]>(`${this.apiUrl}/ai-qa/${uid}`);
  }

  addAIQA(qa: Partial<AIQA>): Observable<AIQA> {
    const qaWithUser = { ...qa, userId: qa.userId || this.userId };
    return this.http.post<AIQA>(`${this.apiUrl}/ai-qa`, qaWithUser);
  }

  deleteAIQA(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/ai-qa/${id}`);
  }

  updateAIQA(id: string, qa: Partial<AIQA>): Observable<AIQA> {
    return this.http.put<AIQA>(`${this.apiUrl}/ai-qa/${id}`, qa);
  }

  // ==================== AUTH SETTINGS ====================

  getAuthSettings(userId?: string): Observable<any> {
    const uid = userId || this.userId;
    return this.http.get(`${this.apiUrl}/auth-settings/${uid}`);
  }

  saveAuthSettings(settings: any, userId?: string): Observable<any> {
    const uid = userId || this.userId;
    return this.http.post(`${this.apiUrl}/auth-settings/${uid}`, settings);
  }

  // ==================== FACE DATA ====================

  getFaceData(userId?: string): Observable<any> {
    const uid = userId || this.userId;
    return this.http.get(`${this.apiUrl}/face-data/${uid}`);
  }

  saveFaceData(faceData: string, userId?: string): Observable<any> {
    const uid = userId || this.userId;
    return this.http.post(`${this.apiUrl}/face-data/${uid}`, { faceData });
  }

  deleteFaceData(userId?: string): Observable<any> {
    const uid = userId || this.userId;
    return this.http.delete(`${this.apiUrl}/face-data/${uid}`);
  }

  // ==================== PORTFOLIO SETTINGS ====================

  getPortfolioSettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/portfolio-settings`);
  }

  savePortfolioSettings(settings: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/portfolio-settings`, settings);
  }

  // ==================== UTILITY ====================

  healthCheck(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  getUserId(): string {
    return this.userId;
  }
}
