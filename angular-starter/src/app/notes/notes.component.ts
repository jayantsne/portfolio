import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { GoogleAuthService, AppUser } from '../shared/google-auth.service';
import { NotesService, SavedNote } from '../shared/notes.service';

@Component({
  selector: 'app-notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.css']
})
export class NotesComponent implements OnInit, OnDestroy {
  user: AppUser | null = null;
  notes: SavedNote[] = [];
  activeNote: SavedNote | null = null;
  isLoading = false;       // loading notes from Firestore
  authChecking = true;     // waiting for Firebase to resolve login state
  deletingId: string | null = null;
  signInError: string | null = null;

  private subs: Subscription[] = [];

  constructor(
    private googleAuth: GoogleAuthService,
    private notesService: NotesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Phase 1: wait for Firebase to resolve the initial auth state.
    // This prevents the sign-in form from flashing before auth is confirmed.
    this.subs.push(
      this.googleAuth.authReady$.pipe(filter(ready => ready), take(1)).subscribe(() => {
        this.authChecking = false;
        this.user = this.googleAuth.currentUser;
        if (this.user) this.startLoadingNotes();
      })
    );

    // Phase 2: react to sign-in / sign-out after initial check
    this.subs.push(
      this.googleAuth.user$.subscribe(user => {
        if (this.authChecking) return; // ignore pre-ready emissions
        const wasNull = !this.user;
        this.user = user;
        if (user && wasNull) {
          // Just signed in — load notes
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

  async signIn(): Promise<void> {
    this.signInError = null;
    try {
      await this.googleAuth.signInWithGoogle();
    } catch (e: any) {
      console.error(e);
      // Show a friendly message for common Firebase errors
      const msg: string = e?.message || '';
      if (msg.includes('Firebase is not configured')) {
        this.signInError = '⚙️ Google Sign-In is not set up yet. Contact the admin to configure Firebase credentials.';
      } else if (msg.includes('popup-closed-by-user') || msg.includes('cancelled-popup-request')) {
        this.signInError = 'Sign-in was cancelled. Please try again.';
      } else if (msg.includes('popup-blocked')) {
        this.signInError = 'Pop-up was blocked by your browser. Please allow pop-ups for this site and try again.';
      } else {
        this.signInError = 'Sign-in failed. Please try again.';
      }
    }
  }

  formatDate(ms: number | undefined): string {
    if (!ms) return '';
    return new Date(ms).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }
}
