import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AI_BACKEND } from '../config/ai.config';
import { AppConfigService } from '../shared/app-config.service';

@Injectable({
  providedIn: 'root'
})
export class AiChatService {

  private readonly apiBase = AI_BACKEND.BASE_URL;

  constructor(private appCfg: AppConfigService) {}

  sendMessage(message: string, toneMode: 'friendly' | 'professional' = 'friendly'): Observable<{ reply: string }> {
    return new Observable(observer => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.apiBase}/ai/stream`, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.responseType = 'text';

      let cursor = 0;
      let accumulated = '';
      let completed = false;

      const parseChunks = () => {
        const newText = xhr.responseText.slice(cursor);
        cursor = xhr.responseText.length;
        for (const line of newText.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const chunk = JSON.parse(line.slice(6));
            if (chunk.done) {
              if (!completed) {
                completed = true;
                observer.next({ reply: accumulated || 'No response received.' });
                observer.complete();
              }
              return;
            }
            accumulated += chunk.token || '';
          } catch {}
        }
      };

      xhr.onprogress = () => parseChunks();
      xhr.onload = () => {
        parseChunks();
        if (!completed) {
          completed = true;
          observer.next({ reply: accumulated || 'No response received.' });
          observer.complete();
        }
      };
      xhr.onerror = () => {
        observer.next({ reply: 'AI service unavailable. Please try again.' });
        observer.complete();
      };

      xhr.send(JSON.stringify({ question: message, maxTokens: this.appCfg.cfg.maxTokensStream, toneMode }));
      return () => xhr.abort();
    });
  }
}
