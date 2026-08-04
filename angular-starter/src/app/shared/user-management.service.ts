import { Injectable }  from '@angular/core';
import { HttpClient }  from '@angular/common/http';
import { Observable }  from 'rxjs';
import { CustomAuthService } from './custom-auth.service';

// ── DTOs ──────────────────────────────────────────────────────────────────

export interface UserSummary {
  userId:          string;
  username:        string;
  email:           string;
  role:            'ADMIN' | 'USER';
  isAuthenticated: boolean;
  lastLogin:       string | null;
  isAdmin:         boolean;
}

export interface UserListResponse {
  total: number;
  users: UserSummary[];
}

export interface AssignRoleRequest {
  targetUserId: string;
  role:         'ADMIN' | 'USER';
}

// ── Admin User Detail (combines auth + subscription) ─────────────────────

export interface AdminUserDetail {
  // Auth
  userId:    string;
  username:  string;
  email:     string;
  role:      'ADMIN' | 'USER';
  lastLogin: string | null;
  isAdmin:   boolean;
  // Subscription
  subscriptionStatus:   string;   // trial | active | expired | none
  hasAccess:            boolean;
  isTrialActive:        boolean;
  isSubscriptionActive: boolean;
  trialDaysRemaining:   number;
  subscriptionPlan:     string | null;
  subscriptionExpiry:   string | null;
  trialEndDate:         string | null;
  signupDate:           string | null;
  razorpayOrderId:      string | null;
  razorpayPaymentId:    string | null;
  // Block
  isBlocked:     boolean;
  blockedAt:     string | null;
  blockedReason: string | null;
}

export interface AdminUserListResponse {
  total: number;
  users: AdminUserDetail[];
}

export interface AdminAnalytics {
  totalUsers:        number;
  adminUsers:        number;
  activeTrial:       number;
  activeSubscribers: number;
  expiredUsers:      number;
  blockedUsers:      number;
}

export interface AdminBlockRequest {
  block:   boolean;
  reason?: string;
}

export interface AdminExtendRequest {
  days: number;
}

export interface AdminActionResult {
  message: string;
  expiry?: string;
  trialEndDate?: string;
}

// ── Service ────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class UserManagementService {

  private readonly authBase  = '/api/auth';
  private readonly adminBase = '/api/user-admin';

  constructor(
    private http:    HttpClient,
    private authSvc: CustomAuthService
  ) {}

  private get headers() { return this.authSvc.getAuthHeaders(); }

  // ── Legacy auth-admin endpoints ──────────────────────────────────────────

  getUsers(skip = 0, limit = 100): Observable<UserListResponse> {
    return this.http.get<UserListResponse>(
      `${this.authBase}/admin/users?skip=${skip}&limit=${limit}`,
      { headers: this.headers }
    );
  }

  assignRole(targetUserId: string, role: 'ADMIN' | 'USER'): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.authBase}/assign-role`,
      { targetUserId, role } as AssignRoleRequest,
      { headers: this.headers }
    );
  }

  // ── User-Admin endpoints ─────────────────────────────────────────────────

  /** Paginated user list with subscription data. */
  getUsersDetailed(
    skip    = 0,
    limit   = 50,
    search?: string,
    role?:   string,
    status?: string
  ): Observable<AdminUserListResponse> {
    let url = `${this.adminBase}/users?skip=${skip}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (role)   url += `&role=${encodeURIComponent(role)}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    return this.http.get<AdminUserListResponse>(url, { headers: this.headers });
  }

  getUserDetail(userId: string): Observable<AdminUserDetail> {
    return this.http.get<AdminUserDetail>(
      `${this.adminBase}/users/${userId}`,
      { headers: this.headers }
    );
  }

  blockUser(userId: string, block: boolean, reason?: string): Observable<AdminActionResult> {
    return this.http.post<AdminActionResult>(
      `${this.adminBase}/users/${userId}/block`,
      { block, reason } as AdminBlockRequest,
      { headers: this.headers }
    );
  }

  activateSubscription(userId: string, days = 30): Observable<AdminActionResult> {
    return this.http.post<AdminActionResult>(
      `${this.adminBase}/users/${userId}/activate`,
      { days } as AdminExtendRequest,
      { headers: this.headers }
    );
  }

  extendSubscription(userId: string, days = 30): Observable<AdminActionResult> {
    return this.http.post<AdminActionResult>(
      `${this.adminBase}/users/${userId}/extend`,
      { days } as AdminExtendRequest,
      { headers: this.headers }
    );
  }

  resetTrial(userId: string): Observable<AdminActionResult> {
    return this.http.post<AdminActionResult>(
      `${this.adminBase}/users/${userId}/reset-trial`,
      {},
      { headers: this.headers }
    );
  }

  cancelSubscription(userId: string): Observable<AdminActionResult> {
    return this.http.post<AdminActionResult>(
      `${this.adminBase}/users/${userId}/cancel`,
      {},
      { headers: this.headers }
    );
  }

  setRole(userId: string, role: 'ADMIN' | 'USER'): Observable<AdminActionResult> {
    return this.http.put<AdminActionResult>(
      `${this.adminBase}/users/${userId}/role`,
      { role },
      { headers: this.headers }
    );
  }

  deleteUser(userId: string): Observable<AdminActionResult> {
    return this.http.delete<AdminActionResult>(
      `${this.adminBase}/users/${userId}`,
      { headers: this.headers }
    );
  }

  getAnalytics(): Observable<AdminAnalytics> {
    return this.http.get<AdminAnalytics>(
      `${this.adminBase}/analytics`,
      { headers: this.headers }
    );
  }

  shareNote(noteId: string, targetUserId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.adminBase}/notes/${encodeURIComponent(noteId)}/share`,
      { targetUserId },
      { headers: this.headers }
    );
  }
}
