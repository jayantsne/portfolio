import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CustomAuthService, AuthUser } from '../shared/custom-auth.service';
import { NotesService, SavedNote } from '../shared/notes.service';

@Component({
  selector: 'app-notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.css']
})
export class NotesComponent implements OnInit, OnDestroy {
  user: AuthUser | null = null;
  notes: SavedNote[] = [];
  activeNote: SavedNote | null = null;
  isLoading = false;
  deletingId: string | null = null;

  private subs: Subscription[] = [];

  constructor(
    private authSvc:      CustomAuthService,
    private notesService: NotesService,
    private router:       Router
  ) {}

  ngOnInit(): void {
    // JWT auth is synchronous — user is available immediately from localStorage
    this.user = this.authSvc.currentUser;
    if (this.user) this.startLoadingNotes();

    // React to sign-in / sign-out events (e.g. login via header modal)
    this.subs.push(
      this.authSvc.currentUser$.subscribe(user => {
        const wasNull = !this.user;
        this.user = user;
        if (user && wasNull) {
          this.startLoadingNotes();
        } else if (!user) {
          this.isLoading = false;
          this.notes = [];
          this.activeNote = null;
        }
      })
    );
  }

  private startLoadingNotes(): void {
    this.isLoading = true;
    this.subs.push(
      this.notesService.notes$.subscribe(notes => {
        this.notes = notes;
        this.isLoading = false;
        if (this.activeNote) {
          const refreshed = notes.find(n => n.id === this.activeNote!.id);
          this.activeNote = refreshed ?? null;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  openNote(note: SavedNote): void {
    this.activeNote = note;
  }

  closeNote(): void {
    this.activeNote = null;
  }

  async deleteNote(note: SavedNote): Promise<void> {
    if (!note.id) return;
    if (!confirm(`Delete note "${note.topic}"?`)) return;
    this.deletingId = note.id;
    try {
      await this.notesService.deleteNote(note.id);
      if (this.activeNote?.id === note.id) this.activeNote = null;
    } finally {
      this.deletingId = null;
    }
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  formatDate(ms: number | undefined): string {
    if (!ms) return '';
    return new Date(ms).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }
}
