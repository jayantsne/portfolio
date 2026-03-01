import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { CustomAuthService } from './custom-auth.service';

export interface SavedNote {
  id?:        string;   // MongoDB _id
  topic:      string;
  content:    string;
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

  async saveNote(topic: string, content: string): Promise<void> {
    const dto = { topic, content };
    const note = await this.http
      .post<SavedNote>(this.url, dto, { headers: this.authSvc.getAuthHeaders() })
      .toPromise();
    if (note) this._notes.next([this.normalize(note), ...this._notes.getValue()]);
    else await this.loadNotes(); // fallback: refresh from server
  }

  async deleteNote(noteId: string): Promise<void> {
    await this.http
      .delete(`${this.url}/${noteId}`, { headers: this.authSvc.getAuthHeaders() })
      .toPromise();
    this._notes.next(this._notes.getValue().filter(n => n.id !== noteId));
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
      savedAtMs: n.savedAtMs ?? (n.savedAt ? new Date(n.savedAt).getTime() : Date.now())
    };
  }
}

