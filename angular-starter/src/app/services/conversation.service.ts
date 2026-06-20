import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatHistoryMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ConversationService {
  private readonly base = `${environment.apiUrl}/conversation`;

  constructor(private http: HttpClient) {}

  getAll(headers: HttpHeaders): Observable<ConversationSummary[]> {
    return this.http
      .get<ConversationSummary[]>(this.base, { headers })
      .pipe(catchError(err => {
        console.error('[ConversationService] getAll failed:', err.status, err.message);
        throw err; // re-throw so the component error handler still fires
      }));
  }

  getMessages(convId: string, headers: HttpHeaders): Observable<ChatHistoryMessage[]> {
    return this.http
      .get<ChatHistoryMessage[]>(`${this.base}/${convId}/messages`, { headers })
      .pipe(catchError(() => of([])));
  }

  create(title: string, headers: HttpHeaders): Observable<ConversationSummary | null> {
    return this.http
      .post<ConversationSummary>(this.base, { title }, { headers })
      .pipe(catchError(() => of(null)));
  }

  addMessage(convId: string, role: string, content: string, headers: HttpHeaders): Observable<any> {
    return this.http
      .post(`${this.base}/${convId}/message`, { role, content }, { headers })
      .pipe(catchError(() => of(null)));
  }

  delete(convId: string, headers: HttpHeaders): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/${convId}`, { headers })
      .pipe(catchError(() => of(undefined as any)));
  }
}
