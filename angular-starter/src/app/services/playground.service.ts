import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

export interface PlaygroundRequest {
  code: string;
  language: string;
}

@Injectable({ providedIn: 'root' })
export class PlaygroundService {

  /** Emits whenever a "Try Now" or "Open in Playground" action is triggered. */
  private readonly _request$ = new BehaviorSubject<PlaygroundRequest | null>(null);
  readonly request$ = this._request$.asObservable();

  constructor(private router: Router) {}

  /**
   * Load code into the Code Playground and navigate to it.
   * The playground component reads this on init/change.
   */
  openWith(code: string, language: string): void {
    const lang = this.normaliseLanguage(language);
    this._request$.next({ code, language: lang });
    this.router.navigate(['/playground']);
  }

  /** Consume the pending request (called by the playground component). */
  consume(): PlaygroundRequest | null {
    const req = this._request$.getValue();
    // Don't clear — playground may re-navigate; component clears after applying
    return req;
  }

  /** Clear after the playground has applied the code. */
  clear(): void {
    this._request$.next(null);
  }

  // ── Normalise language string from markdown fence identifiers ─────────────

  private normaliseLanguage(lang: string): string {
    const map: Record<string, string> = {
      js:          'javascript',
      ts:          'typescript',
      py:          'python',
      cs:          'csharp',
      'c#':        'csharp',
      csharp:      'csharp',
      cpp:         'cpp',
      'c++':       'cpp',
      java:        'java',
      go:          'go',
      golang:      'go',
      rust:        'rust',
      javascript:  'javascript',
      typescript:  'typescript',
      python:      'python',
    };
    return map[lang.toLowerCase()] ?? 'javascript';
  }
}
