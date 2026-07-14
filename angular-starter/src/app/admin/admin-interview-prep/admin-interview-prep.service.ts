import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

export interface AdminPrepQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: string;
  tags: string[];
  answerHint: string;
  noteUrl: string;
  isCovered: boolean;
  coveredAt?: string | null;
  plannedDate?: string | null;
  allowedUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminPrepResponse {
  questions: AdminPrepQuestion[];
  categories: string[];
  total: number;
  covered: number;
  dailyTarget: number;
}

export interface AdminPrepImportQuestion {
  question: string;
  category: string;
  difficulty?: string;
  tags?: string[];
  answerHint?: string;
  noteUrl?: string;
  allowedUserIds?: string[];
}

export interface AdminPrepAiHelperResponse {
  studyPrompt: string;
  notesPrompt: string;
  practicePrompt: string;
}

@Injectable({ providedIn: 'root' })
export class AdminInterviewPrepService {
  private readonly baseUrl = '/api/admin-interview-prep';

  constructor(private http: HttpClient) {}

  getAll(category = 'All', search = '', includeCovered = true): Promise<AdminPrepResponse> {
    let params = new HttpParams().set('includeCovered', includeCovered);
    if (category) params = params.set('category', category);
    if (search.trim()) params = params.set('search', search.trim());
    return this.http.get<AdminPrepResponse>(this.baseUrl, { params }).toPromise();
  }

  getDailyPlan(target = 5, category = 'All'): Promise<AdminPrepQuestion[]> {
    let params = new HttpParams().set('target', target);
    if (category) params = params.set('category', category);
    return this.http.get<AdminPrepQuestion[]>(`${this.baseUrl}/daily`, { params }).toPromise();
  }

  importQuestions(questions: AdminPrepImportQuestion[], replaceExisting: boolean): Promise<{ imported: number }> {
    return this.http.post<{ imported: number }>(`${this.baseUrl}/import`, {
      replaceExisting,
      questions
    }).toPromise();
  }

  setCovered(id: string, covered: boolean): Promise<AdminPrepQuestion> {
    return this.http.patch<AdminPrepQuestion>(`${this.baseUrl}/${id}/covered`, { covered }).toPromise();
  }

  setPlanDate(id: string, plannedDate?: string): Promise<AdminPrepQuestion> {
    return this.http.patch<AdminPrepQuestion>(`${this.baseUrl}/${id}/plan`, {
      plannedDate: plannedDate || null
    }).toPromise();
  }

  setAccess(id: string, allowedUserIds: string[]): Promise<AdminPrepQuestion> {
    return this.http.post<AdminPrepQuestion>(`${this.baseUrl}/${id}/access`, { allowedUserIds }).toPromise();
  }

  deleteQuestion(id: string): Promise<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).toPromise();
  }

  getAiHelper(question: string, category: string): Promise<AdminPrepAiHelperResponse> {
    return this.http.post<AdminPrepAiHelperResponse>(`${this.baseUrl}/ai-helper`, {
      question,
      category
    }).toPromise();
  }
}
