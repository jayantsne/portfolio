import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { CustomAuthService } from './custom-auth.service';

export interface SavedNote {
  id?:        string;   // MongoDB _id
  topic:      string;
  category:   string;   // e.g. Frontend, Backend, AI, DevOps
  tags:       string[];  // user-defined tags
  content:    string;
  isPinned?:  boolean;
  savedAt?:   string;   // ISO date string from backend
  savedAtMs?: number;   // epoch ms for display/sorting
}

@Injectable({ providedIn: 'root' })
export class NotesService {

  private readonly url = `/api/notes`;

  private _notes = new BehaviorSubject<SavedNote[]>([]);
  notes$: Observable<SavedNote[]> = this._notes.asObservable();

  constructor(
    private http:     HttpClient,
    private authSvc:  CustomAuthService
  ) {
    // Reload notes when the user signs in or signs out
    this.authSvc.currentUser$.subscribe(user => {
      if (user) {
        this.loadNotes();
      } else {
        this._notes.next([]);
      }
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async saveNote(topic: string, category: string, content: string, tags: string[] = []): Promise<void> {
    const dto = { topic, category, tags, content };
    const note = await this.http
      .post<SavedNote>(this.url, dto, { headers: this.authSvc.getAuthHeaders() })
      .toPromise();
    if (note) this._notes.next([this.normalize(note), ...this._notes.getValue()]);
    else await this.loadNotes(); // fallback: refresh from server
  }

  /** Full update of a note (topic, category, tags, content). */
  async updateNote(noteId: string, patch: { topic?: string; category?: string; tags?: string[]; content: string }): Promise<void> {
    const updated = await this.http
      .put<SavedNote>(`${this.url}/${noteId}`, patch, { headers: this.authSvc.getAuthHeaders() })
      .toPromise();
    const current = this._notes.getValue();
    if (updated) {
      this._notes.next(current.map(n => n.id === noteId ? this.normalize(updated) : n));
    } else {
      await this.loadNotes();
    }
  }

  /** Append newContent to an existing note, separated by a divider */
  async mergeNote(noteId: string, newContent: string): Promise<void> {
    const existing = this._notes.getValue().find(n => n.id === noteId);
    if (!existing) return;
    const merged = `${existing.content}\n\n---\n\n**Updated explanation:**\n\n${newContent}`;
    await this.updateNote(noteId, { content: merged });
  }

  async deleteNote(noteId: string): Promise<void> {
    await this.http
      .delete(`${this.url}/${noteId}`, { headers: this.authSvc.getAuthHeaders() })
      .toPromise();
    this._notes.next(this._notes.getValue().filter(n => n.id !== noteId));
  }

  /** Toggle pin state for a note — persisted to server. */
  async togglePin(noteId: string): Promise<void> {
    const updated = await this.http
      .patch<SavedNote>(`${this.url}/${noteId}/pin`, {}, { headers: this.authSvc.getAuthHeaders() })
      .toPromise();
    const current = this._notes.getValue();
    if (updated) {
      this._notes.next(current.map(n => n.id === noteId ? this.normalize(updated) : n));
    }
  }

  // ── Duplicate Detection ────────────────────────────────────────────────────

  /**
   * Returns a note that matches both topic and content exactly (after normalisation).
   */
  findExactDuplicate(topic: string, content: string): SavedNote | null {
    const normTopic   = this.normStr(topic);
    const normContent = this.normStr(content);
    return this._notes.getValue().find(n =>
      this.normStr(n.topic) === normTopic &&
      this.normStr(n.content) === normContent
    ) ?? null;
  }

  /**
   * Returns notes whose topic is similar to the given topic (Jaccard ≥ threshold).
   * Default threshold = 0.35 (35 % token overlap).
   */
  findSimilarNotes(topic: string, threshold = 0.35): SavedNote[] {
    const queryTokens = this.tokenize(topic);
    if (queryTokens.size === 0) return [];

    return this._notes.getValue().filter(n => {
      const noteTokens = this.tokenize(n.topic);
      const intersection = [...queryTokens].filter(t => noteTokens.has(t)).length;
      const union = new Set([...queryTokens, ...noteTokens]).size;
      return union > 0 && (intersection / union) >= threshold;
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private normStr(s: string): string {
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private tokenize(s: string): Set<string> {
    return new Set(
      s.toLowerCase()
       .replace(/[^a-z0-9\s]/g, ' ')
       .split(/\s+/)
       .filter(t => t.length > 2)  // skip short stop-words
    );
  }

  async loadNotes(): Promise<void> {
    try {
      const notes = await this.http
        .get<SavedNote[]>(this.url, { headers: this.authSvc.getAuthHeaders() })
        .toPromise();
      this._notes.next((notes ?? []).map(n => this.normalize(n)));
    } catch (err) {
      console.error('[NotesService] loadNotes error:', err);
    }
  }

  get notes(): SavedNote[] {
    return this._notes.getValue();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Ensure savedAtMs is always populated for the template's formatDate() */
  private normalize(n: SavedNote): SavedNote {
    return {
      ...n,
      tags:      n.tags ?? [],
      isPinned:  n.isPinned ?? false,
      savedAtMs: n.savedAtMs ?? (n.savedAt ? new Date(n.savedAt).getTime() : Date.now())
    };
  }
}

