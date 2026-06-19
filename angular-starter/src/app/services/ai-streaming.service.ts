import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AI_BACKEND } from '../config/ai.config';
import { AppConfigService } from '../shared/app-config.service';

export interface StreamChunk {
  token: string;
  done: boolean;
  error?: string;
}

export type OllamaModel = 'qwen' | 'llama';

export const MODEL_MAP: Record<OllamaModel, string> = {
  qwen: 'qwen2.5:3b-instruct-q4_0', // overridden at call-time from AppConfigService
  llama: 'llama3.2:3b'
};

/**
 * Streams AI explanations token-by-token from the ASP.NET backend
 * using Server-Sent Events (text/event-stream).
 */
@Injectable({ providedIn: 'root' })
export class AiStreamingService {
  private readonly apiBase = AI_BACKEND.BASE_URL;

  constructor(private appCfg: AppConfigService) {}

  /**
   * Stream an AI explanation from the backend SSE endpoint.
   * @param question  The question / concept to explain
   * @param model     'qwen' (default) or 'llama' for tutor style
   * @param maxTokens Max tokens to generate (default 512)
   */
  streamExplanation(
    question: string,
    model: OllamaModel = 'qwen',
    maxTokens = 512
  ): Observable<StreamChunk> {
    return new Observable<StreamChunk>(observer => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.apiBase}/ai/stream`, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.responseType = 'text';

      let cursor = 0;

      const parseChunks = () => {
        const newText = xhr.responseText.slice(cursor);
        cursor = xhr.responseText.length;
        for (const line of newText.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const chunk: StreamChunk = JSON.parse(line.slice(6));
            observer.next(chunk);
            if (chunk.done) { observer.complete(); return; }
          } catch {}
        }
      };

      xhr.onprogress = () => parseChunks();
      xhr.onload = () => { parseChunks(); if (!observer.closed) observer.complete(); };
      xhr.onerror = () => observer.error(new Error('XHR error'));

      xhr.send(JSON.stringify({ question, model: model === 'qwen' ? this.appCfg.cfg.modelOllamaStream : MODEL_MAP[model], maxTokens: maxTokens ?? this.appCfg.cfg.maxTokensStream }));
      return () => xhr.abort();
    });
  }
}
