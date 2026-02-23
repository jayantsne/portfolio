import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AiChatService {

  private apiUrl = 'https://portfolio-ai.jayant-ai.workers.dev'; // change if local

  constructor(private http: HttpClient) {}

  sendMessage(message: string): Observable<any> {
    return this.http.post(this.apiUrl, { message });
  }
}