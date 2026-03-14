import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';
import { Subject }        from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import {
  UserManagementService,
  AdminUserDetail,
  AdminAnalytics
} from '../../shared/user-management.service';

type ModalAction = 'block' | 'unblock' | 'activate' | 'extend' | 'reset-trial' | 'cancel' | 'delete' | 'role';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrls:   ['./admin-users.component.css']
})
export class AdminUsersComponent implements OnInit, OnDestroy {

  // ── Data ──────────────────────────────────────────────────────────────────
  users:     AdminUserDetail[] = [];
  analytics: AdminAnalytics | null = null;

  // ── Pagination ────────────────────────────────────────────────────────────
  pageSize  = 20;
  pageIndex = 0;
  total     = 0;

  // ── Filters ───────────────────────────────────────────────────────────────
  searchQuery  = '';
  filterRole   = '';
  filterStatus = '';

  // ── Loading / Error ───────────────────────────────────────────────────────
  loading          = false;
  loadingAnalytics = false;
  error: string | null = null;
  actionLoading: { [userId: string]: boolean } = {};

  // ── Modal ─────────────────────────────────────────────────────────────────
  showModal       = false;
  modalAction: ModalAction | null = null;
  modalUser: AdminUserDetail | null = null;
  modalDays       = 30;
  modalBlockReason = '';
  modalRole: 'ADMIN' | 'USER' = 'USER';
  modalMessage    = '';
  modalSuccess    = false;
  modalWorking    = false;

  private destroy$ = new Subject<void>();
  private search$  = new Subject<string>();

  constructor(private svc: UserManagementService) {}

  ngOnInit(): void {
    this.loadAnalytics();
    this.loadUsers();

    // Debounce search input
    this.search$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.pageIndex = 0;
      this.loadUsers();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Data Loading ──────────────────────────────────────────────────────────

  loadAnalytics(): void {
    this.loadingAnalytics = true;
    this.svc.getAnalytics().subscribe({
      next:  a => { this.analytics = a; this.loadingAnalytics = false; },
      error: e => { console.error('Analytics error:', e); this.loadingAnalytics = false; }
    });
  }

  loadUsers(): void {
    this.loading = true;
    this.error   = null;
    const skip   = this.pageIndex * this.pageSize;
    this.svc.getUsersDetailed(
      skip,
      this.pageSize,
      this.searchQuery || undefined,
      this.filterRole  || undefined,
      this.filterStatus|| undefined
    ).subscribe({
      next: res => {
        this.users   = res.users;
        this.total   = res.total;
        this.loading = false;
      },
      error: e => {
        console.error('Load users error:', e);
        this.error   = 'Failed to load users. Check your connection.';
        this.loading = false;
      }
    });
  }

  onSearchChange(): void { this.search$.next(this.searchQuery); }

  onFilterChange(): void {
    this.pageIndex = 0;
    this.loadUsers();
  }

  prevPage(): void { if (this.pageIndex > 0) { this.pageIndex--; this.loadUsers(); } }
  nextPage(): void { if ((this.pageIndex + 1) * this.pageSize < this.total) { this.pageIndex++; this.loadUsers(); } }

  get totalPages(): number { return Math.ceil(this.total / this.pageSize); }
  get currentPageStart(): number { return this.pageIndex * this.pageSize + 1; }
  get currentPageEnd(): number   { return Math.min((this.pageIndex + 1) * this.pageSize, this.total); }

  // ── Modals ────────────────────────────────────────────────────────────────

  openModal(user: AdminUserDetail, action: ModalAction): void {
    this.modalUser        = user;
    this.modalAction      = action;
    this.modalDays        = 30;
    this.modalBlockReason = '';
    this.modalRole        = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    this.modalMessage     = '';
    this.modalSuccess     = false;
    this.modalWorking     = false;
    this.showModal        = true;
  }

  closeModal(): void {
    if (!this.modalWorking) {
      this.showModal   = false;
      this.modalUser   = null;
      this.modalAction = null;
    }
  }

  confirmModal(): void {
    if (!this.modalUser || !this.modalAction || this.modalWorking) return;
    this.modalWorking = true;
    this.modalMessage = '';

    const u  = this.modalUser;
    let obs$: any;

    switch (this.modalAction) {
      case 'block':
        obs$ = this.svc.blockUser(u.userId, true, this.modalBlockReason || undefined);
        break;
      case 'unblock':
        obs$ = this.svc.blockUser(u.userId, false);
        break;
      case 'activate':
        obs$ = this.svc.activateSubscription(u.userId, this.modalDays);
        break;
      case 'extend':
        obs$ = this.svc.extendSubscription(u.userId, this.modalDays);
        break;
      case 'reset-trial':
        obs$ = this.svc.resetTrial(u.userId);
        break;
      case 'cancel':
        obs$ = this.svc.cancelSubscription(u.userId);
        break;
      case 'delete':
        obs$ = this.svc.deleteUser(u.userId);
        break;
      case 'role':
        obs$ = this.svc.setRole(u.userId, this.modalRole);
        break;
    }

    obs$.subscribe({
      next: (res: any) => {
        this.modalMessage = res.message || 'Done.';
        this.modalSuccess = true;
        this.modalWorking = false;
        this.loadUsers();
        this.loadAnalytics();
        setTimeout(() => this.closeModal(), 1500);
      },
      error: (e: any) => {
        this.modalMessage = e?.error?.message || e?.message || 'Action failed.';
        this.modalSuccess = false;
        this.modalWorking = false;
      }
    });
  }

  // ── Display Helpers ───────────────────────────────────────────────────────

  statusBadge(u: AdminUserDetail): { text: string; cls: string } {
    if (u.isBlocked)              return { text: '🚫 Blocked',      cls: 'badge-blocked' };
    if (u.isAdmin)                return { text: '🛡️ Admin',        cls: 'badge-admin'   };
    if (u.isTrialActive)          return { text: `⏳ Trial (${u.trialDaysRemaining}d)`, cls: 'badge-trial' };
    if (u.isSubscriptionActive)   return { text: '✅ Active',       cls: 'badge-active'  };
    if (u.subscriptionStatus === 'none') return { text: '—',        cls: 'badge-none'    };
    return                               { text: '❌ Expired',      cls: 'badge-expired' };
  }

  roleBadge(role: string): string {
    return role === 'ADMIN' ? 'badge-role-admin' : 'badge-role-user';
  }

  formatDate(d: string | null): string {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatDateTime(d: string | null): string {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  modalTitle(): string {
    const name = this.modalUser?.username || '';
    switch (this.modalAction) {
      case 'block':       return `Block User — ${name}`;
      case 'unblock':     return `Unblock User — ${name}`;
      case 'activate':    return `Activate Subscription — ${name}`;
      case 'extend':      return `Extend Subscription — ${name}`;
      case 'reset-trial': return `Reset Trial — ${name}`;
      case 'cancel':      return `Cancel Subscription — ${name}`;
      case 'delete':      return `⚠️ Delete User — ${name}`;
      case 'role':        return `Change Role — ${name}`;
      default:            return 'Confirm Action';
    }
  }

  isDestructive(): boolean {
    return this.modalAction === 'delete' || this.modalAction === 'block' || this.modalAction === 'cancel';
  }
}
