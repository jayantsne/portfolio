import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CustomAuthService } from './custom-auth.service';

// ── DTO interfaces (mirrors backend) ────────────────────────────────────────

export interface DailyStatDto {
  date:        string;   // "yyyy-MM-dd"
  visits:      number;
  clicks:      number;
  uniqueUsers: number;
}

export interface PageStatDto  { page:      string; count: number; }
export interface EventStatDto { eventName: string; count: number; }

export interface RecentSessionDto {
  sessionId:  string;
  userId?:    string;
  username?:  string;
  isLoggedIn: boolean;
  ipAddress:  string;
  firstPage:  string;
  lastSeen:   string;
  pageViews:  number;
}

export interface AnalyticsDashboard {
  uniqueVisitors:  number;
  totalVisits:     number;
  totalClicks:     number;
  loggedInVisits:  number;
  guestVisits:     number;
  dailyStats:      DailyStatDto[];
  topPages:        PageStatDto[];
  topEvents:       EventStatDto[];
  recentSessions:  RecentSessionDto[];
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AnalyticsService {

  /** Browser-tab session id — constant for the lifetime of the tab. */
  private readonly sessionId: string;
  private currentPage: string = '/';

  constructor(
    private http:    HttpClient,
    private router:  Router,
    private auth:    CustomAuthService
  ) {
    // Reuse or mint a session id per browser tab
    const stored = sessionStorage.getItem('_analytics_sid');
    if (stored) {
      this.sessionId = stored;
    } else {
      this.sessionId = this.generateId();
      sessionStorage.setItem('_analytics_sid', this.sessionId);
    }

    // Auto-track every navigation (fires after Angular finishes routing)
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.currentPage = e.urlAfterRedirects ?? e.url;
        this.trackVisit(this.currentPage);
      });
  }

  // ── Public tracking API ──────────────────────────────────────────────────

  /** Called automatically on NavigationEnd; can also be called manually. */
  trackVisit(page: string): void {
    const body = {
      sessionId: this.sessionId,
      page:      page || '/',
      referrer:  document.referrer || ''
    };
    const headers = this.getOptionalAuthHeaders();
    this.http.post('/api/analytics/visit', body, { headers }).toPromise()
      .catch(() => { /* silent — never break UX for analytics */ });
  }

  /**
   * Track a user interaction.
   * @param eventName Semantic name e.g. "ask_question", "save_note"
   * @param elementId Optional id of clicked element
   * @param elementText Optional visible label (auto-truncated server-side)
   */
  trackClick(eventName: string, elementId?: string, elementText?: string): void {
    const body = {
      sessionId:   this.sessionId,
      eventName:   eventName,
      pageName:    this.currentPage,
      elementId:   elementId   || null,
      elementText: elementText || null
    };
    const headers = this.getOptionalAuthHeaders();
    this.http.post('/api/analytics/click', body, { headers }).toPromise()
      .catch(() => { /* silent */ });
  }

  // Legacy Google Analytics shims — kept so callers don't break during migration
  public init(): void { /* no-op — tracking starts automatically in constructor */ }
  public trackEvent(eventName: string, _cat?: string, label?: string): void {
    this.trackClick(eventName, undefined, label);
  }
  public trackButtonClick(buttonName: string, location: string): void {
    this.trackClick('button_click', undefined, `${buttonName} - ${location}`);
  }
  public trackFormSubmit(formName: string, _success?: boolean): void {
    this.trackClick('form_submit', undefined, formName);
  }
  public trackInteraction(type: string, details: string): void {
    this.trackClick('interaction', undefined, `${type}: ${details}`);
  }
  public trackError(type: string, msg: string): void {
    this.trackClick('error', undefined, `${type}: ${msg}`);
  }
  public trackTiming(_cat: string, _var: string, _val: number): void { /* no-op */ }
  public trackQuestionView(id: string, cat: string): void {
    this.trackClick('question_view', undefined, `${cat} - ${id}`);
  }
  public trackAIAnswerRequest(id: string, cat: string): void {
    this.trackClick('ai_answer_request', undefined, `${cat} - ${id}`);
  }
  public trackDownload(file: string, type: string): void {
    this.trackClick('file_download', undefined, `${type} - ${file}`);
  }
  public trackShare(platform: string, content: string): void {
    this.trackClick('share', undefined, `${platform} - ${content}`);
  }

  // ── Admin dashboard API ──────────────────────────────────────────────────

  getDashboard(days: number = 30): Promise<AnalyticsDashboard> {
    return this.http
      .get<AnalyticsDashboard>(`/api/analytics/dashboard?days=${days}`,
        { headers: this.auth.getAuthHeaders() })
      .toPromise()
      .then(d => d ?? this.emptyDashboard());
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private getOptionalAuthHeaders(): HttpHeaders {
    try {
      if (this.auth.isLoggedIn) {
        return this.auth.getAuthHeaders();
      }
    } catch (_) {}
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  private emptyDashboard(): AnalyticsDashboard {
    return {
      uniqueVisitors: 0, totalVisits: 0, totalClicks: 0,
      loggedInVisits: 0, guestVisits: 0,
      dailyStats: [], topPages: [], topEvents: [], recentSessions: []
    };
  }
}
