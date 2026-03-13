import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CustomAuthService } from '../shared/custom-auth.service';
import { RoadmapSection } from '../interview-prep/interview-prep.component';

// ─── Backend DTOs (mirror of C# Shared DTOs) ─────────────────────────────────

export interface RoadmapTopicDto {
  id:          string;
  text:        string;
  done:        boolean;
  completedAt: string | null;
}

export interface RoadmapSectionDto {
  id:       string;
  title:    string;
  emoji:    string;
  expanded: boolean;
  topics:   RoadmapTopicDto[];
}

export interface InterviewRoadmapDto {
  id:             string;
  userId:         string;
  techStackId:    string;
  techStackName:  string;
  techStackIcon:  string;
  sections:       RoadmapSectionDto[];
  doneCount:      number;
  totalCount:     number;
  percent:        number;
  createdAt:      string;
  updatedAt:      string;
  lastAccessedAt: string;
}

export interface SaveRoadmapPayload {
  techStackId:   string;
  techStackName: string;
  techStackIcon: string;
  sections:      RoadmapSectionDto[];
}

export interface UpdateProgressPayload {
  topics: Array<{ id: string; done: boolean }>;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class InterviewRoadmapService {

  private readonly url = '/api/interview-roadmap';

  constructor(
    private http:    HttpClient,
    private authSvc: CustomAuthService,
  ) {}

  // ── Read ──────────────────────────────────────────────────────────────────

  /** Load all saved roadmaps for the current user. Returns [] on error. */
  getAll(): Observable<InterviewRoadmapDto[]> {
    return this.http.get<InterviewRoadmapDto[]>(this.url, {
      headers: this.authSvc.getAuthHeaders()
    }).pipe(catchError(() => of([])));
  }

  /** Load the roadmap for a specific tech-stack. Returns null if not saved yet. */
  getByStack(techStackId: string): Observable<InterviewRoadmapDto | null> {
    return this.http.get<InterviewRoadmapDto>(
      `${this.url}/stack/${techStackId}`,
      { headers: this.authSvc.getAuthHeaders() }
    ).pipe(catchError(() => of(null)));
  }

  // ── Write ─────────────────────────────────────────────────────────────────

  /** Upsert a full roadmap (structure + initial done state). */
  save(payload: SaveRoadmapPayload): Observable<InterviewRoadmapDto | null> {
    return this.http.post<InterviewRoadmapDto>(this.url, payload, {
      headers: this.authSvc.getAuthHeaders()
    }).pipe(catchError(() => of(null)));
  }

  /** Patch only topic done-states for an already-saved roadmap. */
  updateProgress(roadmapId: string, sections: RoadmapSection[]): Observable<InterviewRoadmapDto | null> {
    const topics: Array<{ id: string; done: boolean }> = [];
    sections.forEach(sec => sec.topics.forEach(t => topics.push({ id: t.id, done: t.done })));
    const payload: UpdateProgressPayload = { topics };
    return this.http.put<InterviewRoadmapDto>(
      `${this.url}/${roadmapId}/progress`,
      payload,
      { headers: this.authSvc.getAuthHeaders() }
    ).pipe(catchError(() => of(null)));
  }

  delete(roadmapId: string): Observable<boolean> {
    return this.http.delete(`${this.url}/${roadmapId}`, {
      headers: this.authSvc.getAuthHeaders()
    }).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Convert backend sections → RoadmapSection[] (for rehydrating the component). */
  toRoadmapSections(dto: InterviewRoadmapDto): RoadmapSection[] {
    return dto.sections.map((s, i) => ({
      id:       s.id,
      title:    s.title,
      emoji:    s.emoji,
      expanded: i === 0, // keep first section open
      topics:   s.topics.map(t => ({
        id:   t.id,
        text: t.text,
        done: t.done,
      })),
    }));
  }
}
