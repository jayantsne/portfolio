import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CustomAuthService } from './custom-auth.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface RevisionItem {
  id:               string;
  noteId:           string;
  noteTopic:        string;
  noteContent:      string;
  noteCategory:     string;
  nextReviewDate:   string;
  lastReviewedDate: string | null;
  difficulty:       'new' | 'easy' | 'medium' | 'hard';
  reviewCount:      number;
  intervalDays:     number;
  isDueToday:       boolean;
}

export interface TodayRevisionDto {
  totalDue: number;
  totalNew: number;
  items:    RevisionItem[];
}

export interface RevisionQuestion {
  type:        'conceptual' | 'factual' | 'practical';
  question:    string;
  answer:      string;
  explanation: string;
}

export interface RevisionQuestionsResponse {
  noteId:     string;
  noteTopic:  string;
  questions:  RevisionQuestion[];
  isFallback: boolean;
}

export interface EnrolledNotesDto {
  totalEnrolled: number;
  totalDue:      number;
  items:         RevisionItem[];
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class RevisionService {

  private readonly base = '/api/revision';

  constructor(
    private http:     HttpClient,
    private authSvc:  CustomAuthService,
  ) {}

  getToday(): Observable<TodayRevisionDto> {
    return this.http.get<TodayRevisionDto>(
      `${this.base}/today`,
      { headers: this.authSvc.getAuthHeaders() },
    );
  }

  getEnrolled(): Observable<EnrolledNotesDto> {
    return this.http.get<EnrolledNotesDto>(
      `${this.base}/enrolled`,
      { headers: this.authSvc.getAuthHeaders() },
    );
  }

  enrollNote(noteId: string): Observable<RevisionItem> {
    return this.http.post<RevisionItem>(
      `${this.base}/enroll`,
      { noteId },
      { headers: this.authSvc.getAuthHeaders() },
    );
  }

  unenrollNote(noteId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/enroll/${noteId}`,
      { headers: this.authSvc.getAuthHeaders() },
    );
  }

  getQuestions(noteId: string): Observable<RevisionQuestionsResponse> {
    return this.http.get<RevisionQuestionsResponse>(
      `${this.base}/${noteId}/questions`,
      { headers: this.authSvc.getAuthHeaders() },
    );
  }

  submitFeedback(revisionItemId: string, difficulty: 'easy' | 'medium' | 'hard'): Observable<RevisionItem> {
    return this.http.post<RevisionItem>(
      `${this.base}/${revisionItemId}/feedback`,
      { difficulty },
      { headers: this.authSvc.getAuthHeaders() },
    );
  }
}
