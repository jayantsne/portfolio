import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CustomAuthService } from '../shared/custom-auth.service';
import { AnalyticsService, AnalyticsDashboard, DailyStatDto } from '../shared/analytics.service';

@Component({
  selector: 'app-analytics-dashboard',
  templateUrl: './analytics-dashboard.component.html',
  styleUrls: ['./analytics-dashboard.component.css']
})
export class AnalyticsDashboardComponent implements OnInit, OnDestroy {

  dashboard: AnalyticsDashboard | null = null;
  loading    = true;
  error      = '';
  selectedDays = 30;

  readonly dayOptions = [
    { label: 'Today',      value: 1  },
    { label: '7 days',     value: 7  },
    { label: '30 days',    value: 30 },
    { label: '90 days',    value: 90 },
  ];

  private refreshTimer: any = null;

  constructor(
    private auth:      CustomAuthService,
    private router:    Router,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    if (!this.auth.isLoggedIn || this.auth.currentUser?.role !== 'ADMIN') {
      this.router.navigate(['/admin-login']);
      return;
    }
    this.load();
    // Auto-refresh every 60 seconds
    this.refreshTimer = setInterval(() => this.load(false), 60_000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  async load(showSpinner = true): Promise<void> {
    if (showSpinner) { this.loading = true; this.error = ''; }
    try {
      this.dashboard = await this.analytics.getDashboard(this.selectedDays);
    } catch (e: any) {
      this.error = e?.error?.error ?? e?.message ?? 'Failed to load analytics.';
    } finally {
      this.loading = false;
    }
  }

  changeDays(days: number): void {
    this.selectedDays = days;
    this.load();
  }

  // ── Chart helpers ──────────────────────────────────────────────────────

  /** Max visit value in daily stats (for bar scaling). */
  get chartMax(): number {
    if (!this.dashboard?.dailyStats?.length) return 1;
    return Math.max(...this.dashboard.dailyStats.map(d => d.visits), 1);
  }

  barHeight(value: number): number {
    return Math.round((value / this.chartMax) * 100);
  }

  /** Last N days to display in the bar chart (cap at 30 for readability). */
  get chartDays(): DailyStatDto[] {
    const stats = this.dashboard?.dailyStats ?? [];
    return stats.slice(-30);
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString();
  }

  goToDashboard(): void  { this.router.navigate(['/admin-dashboard']); }
  goToDeployment(): void { this.router.navigate(['/admin-deploy']); }
  logout(): void {
    this.auth.logout();
    this.router.navigate(['/admin-login']);
  }
}
