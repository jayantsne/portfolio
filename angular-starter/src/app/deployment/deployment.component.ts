import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CustomAuthService, AuthUser } from '../shared/custom-auth.service';

export interface DeploymentLog {
  id:                  string;
  target:              string;
  triggeredByUsername: string;
  sourceIp:            string;
  startedAt:           string;
  completedAt?:        string;
  exitCode?:           number;
  status:              string;   // "running" | "success" | "failed"
  output:              string;
  error?:              string;
}

@Component({
  selector:    'app-deployment',
  templateUrl: './deployment.component.html',
  styleUrls:   ['./deployment.component.css']
})
export class DeploymentComponent implements OnInit, OnDestroy {

  user: AuthUser | null = null;

  /** Logs panel ─ history */
  logs:          DeploymentLog[] = [];
  logsLoading  = false;
  logsError    = '';

  /** Active deployment being tracked */
  activeLog: DeploymentLog | null = null;
  isDeploying  = false;
  deployError  = '';

  private pollTimer: any = null;

  constructor(
    private http:    HttpClient,
    private authSvc: CustomAuthService,
    private router:  Router
  ) {}

  ngOnInit(): void {
    this.user = this.authSvc.currentUser;
    if (this.user?.role === 'ADMIN') {
      this.loadLogs();
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  // ── Access guard helpers ──────────────────────────────────────────────────

  get isAdmin():    boolean { return this.user?.role === 'ADMIN'; }
  get isLoggedIn(): boolean { return !!this.user; }

  // ── Deploy actions ────────────────────────────────────────────────────────

  async deploy(target: 'backend' | 'frontend'): Promise<void> {
    if (!this.isAdmin || this.isDeploying) return;

    if (!confirm(`Deploy ${target} to production?\n\nThis will trigger the deployment script on the server.`)) {
      return;
    }

    this.isDeploying  = true;
    this.deployError  = '';
    this.activeLog    = null;
    this.stopPolling();

    try {
      const response = await this.http
        .post<any>('/api/deploy', { target }, { headers: this.authSvc.getAuthHeaders() })
        .toPromise();

      // Start polling for status
      this.startPolling(response.logId);
    } catch (err: any) {
      this.isDeploying = false;
      this.deployError = this.extractError(err);
      console.error('[Deploy] trigger error:', err);
    }
  }

  // ── Log management ────────────────────────────────────────────────────────

  async loadLogs(): Promise<void> {
    this.logsLoading = true;
    this.logsError   = '';
    try {
      const logs = await this.http
        .get<DeploymentLog[]>('/api/deploy/logs?limit=15', { headers: this.authSvc.getAuthHeaders() })
        .toPromise();
      this.logs = logs ?? [];
    } catch (err: any) {
      this.logsError = this.extractError(err);
    } finally {
      this.logsLoading = false;
    }
  }

  viewLog(log: DeploymentLog): void {
    this.activeLog   = log;
    this.deployError = '';
  }

  closeActiveLog(): void {
    if (!this.isDeploying) {
      this.activeLog = null;
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  goToDashboard(): void {
    this.router.navigate(['/admin-dashboard']);
  }

  goToAnalytics(): void {
    this.router.navigate(['/admin-analytics']);
  }

  // ── Display helpers ───────────────────────────────────────────────────────

  formatDate(iso: string | undefined): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  durationMs(log: DeploymentLog): string {
    if (!log.completedAt) return '…';
    const ms = new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime();
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }

  statusIcon(status: string): string {
    switch (status) {
      case 'success': return '✅';
      case 'failed':  return '❌';
      case 'running': return '⏳';
      default:        return '❓';
    }
  }

  targetIcon(target: string): string {
    return target === 'backend' ? '⚙️' : '🌐';
  }

  isRunning(log: DeploymentLog | null): boolean {
    return log?.status === 'running';
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private startPolling(logId: string): void {
    this.stopPolling();
    this.pollTimer = setInterval(() => this.pollLog(logId), 2000);
    this.pollLog(logId); // immediate first call
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async pollLog(logId: string): Promise<void> {
    try {
      const log = await this.http
        .get<DeploymentLog>(`/api/deploy/logs/${logId}`, { headers: this.authSvc.getAuthHeaders() })
        .toPromise();

      if (!log) return;

      this.activeLog = log;

      if (log.status !== 'running') {
        this.stopPolling();
        this.isDeploying = false;
        await this.loadLogs(); // refresh history
      }
    } catch (err: any) {
      console.error('[Deploy] poll error:', err);
      // If 403 or 401, stop polling
      if (err?.status === 401 || err?.status === 403) {
        this.stopPolling();
        this.isDeploying = false;
        this.deployError = 'Access denied while polling. Are you still on localhost?';
      }
    }
  }

  private extractError(err: any): string {
    if (err?.status === 401)  return 'Unauthorized — please log in as ADMIN.';
    if (err?.status === 403)  return 'Access denied — this page is only accessible from localhost.';
    if (err?.status === 503)  return err?.error?.error ?? 'Deployment script not configured on server.';
    if (err?.status === 400)  return err?.error?.error ?? 'Bad request.';
    return err?.error?.error ?? err?.message ?? 'Unknown error.';
  }
}
