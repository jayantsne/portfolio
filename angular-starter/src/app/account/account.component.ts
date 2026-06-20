import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { CustomAuthService } from '../shared/custom-auth.service';
import { SubscriptionService, SubscriptionStatus } from '../shared/subscription.service';
import { environment } from '../../environments/environment';

interface UsageStatus {
  remainingSearches: number;
  totalUsed: number;
  isPremium: boolean;
  freeLimit: number;
}

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css']
})
export class AccountComponent implements OnInit, OnDestroy {

  status: SubscriptionStatus | null = null;
  usage: UsageStatus | null = null;
  loading = true;
  usageLoading = false;

  private sub$: Subscription | null = null;

  constructor(
    public  auth:    CustomAuthService,
    public  subSvc:  SubscriptionService,
    private http:    HttpClient
  ) {}

  ngOnInit(): void {
    if (!this.auth.isLoggedIn) {
      this.loading = false;
      return;
    }

    this.sub$ = this.subSvc.status$.subscribe(s => {
      this.status  = s;
      this.loading = false;
    });

    const userId = this.auth.currentUser?.userId;
    if (userId) {
      this.subSvc.refreshStatus(userId);
      this.loadUsageStats(userId);
    } else {
      this.loading = false;
    }
  }

  ngOnDestroy(): void { this.sub$?.unsubscribe(); }

  private loadUsageStats(userId: string): void {
    this.usageLoading = true;
    this.http.get<UsageStatus>(
      `${environment.apiUrl}/usage/status/${userId}`,
      { headers: this.auth.getAuthHeaders() }
    ).subscribe({
      next:  u  => { this.usage = u; this.usageLoading = false; },
      error: () => { this.usageLoading = false; }
    });
  }

  get planLabel(): string {
    if (this.auth.isAdmin)                    return '🛡️ Admin';
    if (this.status?.isSubscriptionActive)    return '⚡ Pro';
    if (this.status?.isTrialActive)           return '🎯 Trial';
    return '🆓 Free';
  }

  get planClass(): string {
    if (this.auth.isAdmin)                    return 'badge-admin';
    if (this.status?.isSubscriptionActive)    return 'badge-pro';
    if (this.status?.isTrialActive)           return 'badge-trial';
    return 'badge-free';
  }

  get usagePercent(): number {
    if (!this.usage || this.subSvc.hasAccess) return 0;
    return Math.min(100, Math.round((this.usage.totalUsed / this.usage.freeLimit) * 100));
  }
}
