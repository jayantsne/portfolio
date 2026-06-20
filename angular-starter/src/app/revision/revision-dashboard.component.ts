import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import {
  RevisionService, RevisionItem, TodayRevisionDto, EnrolledNotesDto,
} from '../shared/revision.service';
import { CustomAuthService } from '../shared/custom-auth.service';
import { NotesService, SavedNote } from '../shared/notes.service';

type DashTab = 'today' | 'all';

@Component({
  selector: 'app-revision-dashboard',
  templateUrl: './revision-dashboard.component.html',
  styleUrls: ['./revision-dashboard.component.css'],
})
export class RevisionDashboardComponent implements OnInit {

  // ── State ──────────────────────────────────────────────────────────────
  tab: DashTab = 'today';

  today:    TodayRevisionDto | null  = null;
  enrolled: EnrolledNotesDto | null  = null;
  myNotes:  SavedNote[]              = [];

  loading  = true;
  error    = false;

  enrollingId: string | null = null;  // noteId currently being enrolled
  toast: { msg: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any;

  // ── Lifecycle ──────────────────────────────────────────────────────────
  constructor(
    public  auth:     CustomAuthService,
    private revSvc:   RevisionService,
    private notesSvc: NotesService,
    private router:   Router,
    private cdr:      ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  // ── Data loading ────────────────────────────────────────────────────────

  load(): void {
    this.loading = true;
    this.error   = false;

    // Load today + enrolled in parallel
    let todayDone    = false;
    let enrolledDone = false;
    const maybeFinish = () => {
      if (todayDone && enrolledDone) {
        this.loading = false;
        this.cdr.markForCheck();
      }
    };

    this.revSvc.getToday().subscribe({
      next: d  => { this.today = d; todayDone = true; maybeFinish(); },
      error: _ => { this.error = true; todayDone = true; maybeFinish(); },
    });

    this.revSvc.getEnrolled().subscribe({
      next: d  => { this.enrolled = d; enrolledDone = true; maybeFinish(); },
      error: _ => { this.error = true; enrolledDone = true; maybeFinish(); },
    });

    // Load all user notes for the "Add notes to revision" strip
    this.notesSvc.loadNotes().then(() => {
      this.myNotes = this.notesSvc['_notes'].getValue();
      this.cdr.markForCheck();
    }).catch(() => {});
  }

  // ── Navigation ──────────────────────────────────────────────────────────

  startSession(item: RevisionItem): void {
    this.router.navigate(['/revision/session', item.noteId], {
      state: { revisionItemId: item.id },
    });
  }

  // ── Enrolment ───────────────────────────────────────────────────────────

  isEnrolled(noteId: string): boolean {
    return !!this.enrolled?.items.some(i => i.noteId === noteId);
  }

  enroll(note: SavedNote): void {
    if (!note.id || this.enrollingId) return;
    this.enrollingId = note.id;
    this.revSvc.enrollNote(note.id).subscribe({
      next: item => {
        this.enrolled?.items.push(item);
        this.showToast(`"${note.topic}" added to revision`, 'success');
        this.enrollingId = null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.showToast('Failed to enrol note', 'error');
        this.enrollingId = null;
        this.cdr.markForCheck();
      },
    });
  }

  unenroll(item: RevisionItem): void {
    this.revSvc.unenrollNote(item.noteId).subscribe({
      next: () => {
        if (this.enrolled) {
          this.enrolled.items = this.enrolled.items.filter(i => i.noteId !== item.noteId);
          this.enrolled.totalEnrolled = this.enrolled.items.length;
          this.enrolled.totalDue      = this.enrolled.items.filter(i => i.isDueToday).length;
        }
        if (this.today) {
          this.today.items = this.today.items.filter(i => i.noteId !== item.noteId);
          this.today.totalDue = this.today.items.length;
        }
        this.showToast('Note removed from revision', 'success');
        this.cdr.markForCheck();
      },
      error: () => this.showToast('Failed to unenrol note', 'error'),
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  difficultyLabel(d: string): string {
    const map: Record<string, string> = { new: 'New', easy: 'Easy', medium: 'Medium', hard: 'Hard' };
    return map[d] ?? d;
  }

  difficultyClass(d: string): string {
    return `rv-badge rv-badge--${d}`;
  }

  formatDate(d: string | null): string {
    if (!d) return '—';
    const date = new Date(d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((date.getTime() - today.getTime()) / 86_400_000);
    if (diff < 0)  return `${Math.abs(diff)}d overdue`;
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `In ${diff} days`;
  }

  get unenrolledNotes(): SavedNote[] {
    const enrolled = new Set(this.enrolled?.items.map(i => i.noteId) ?? []);
    return this.myNotes.filter(n => n.id && !enrolled.has(n.id));
  }

  private showToast(msg: string, type: 'success' | 'error'): void {
    clearTimeout(this.toastTimer);
    this.toast = { msg, type };
    this.toastTimer = setTimeout(() => { this.toast = null; this.cdr.markForCheck(); }, 3500);
  }
}
