import { Injectable } from '@angular/core';
import { HttpClient }  from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap }  from 'rxjs/operators';
import { CustomAuthService } from './custom-auth.service';

// ── Shared interfaces ──────────────────────────────────────────────────────
export interface SubscriptionStatus {
  userId:               string;
  subscriptionStatus:   'trial' | 'active' | 'expired' | 'admin';
  hasAccess:            boolean;
  isTrialActive:        boolean;
  isSubscriptionActive: boolean;
  trialDaysRemaining:   number;
  subscriptionPlan:     string | null;
  subscriptionExpiry:   string | null;  // ISO date
  trialEndDate:         string;
  signupDate:           string;
  /** True when the user holds the ADMIN role — payment/trial UI should be hidden. */
  isAdmin?:             boolean;
}

export interface CreateOrderResponse {
  orderId:     string;
  amountPaise: number;
  currency:    string;
  keyId:       string;
}

export interface VerifyPaymentRequest {
  userId:              string;
  razorpayOrderId:     string;
  razorpayPaymentId:   string;
  razorpaySignature:   string;
}

export interface PaymentVerifiedResponse {
  success:              boolean;
  message:              string;
  subscriptionStatus:   string;
  subscriptionExpiry:   string | null;
}

// ── Service ────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class SubscriptionService {

  private readonly base = '/api/subscription';

  private _status = new BehaviorSubject<SubscriptionStatus | null>(null);
  /** Live subscription status — components can subscribe to this. */
  status$: Observable<SubscriptionStatus | null> = this._status.asObservable();

  constructor(
    private http:    HttpClient,
    private authSvc: CustomAuthService
  ) {
    // Refresh status whenever auth state changes
    this.authSvc.currentUser$.subscribe(user => {
      if (user) this.refreshStatus(user.userId);
      else      this._status.next(null);
    });
  }

  // ── Getters ──────────────────────────────────────────────────────────────

  get currentStatus(): SubscriptionStatus | null { return this._status.value; }

  /** true if admin OR trial is active OR subscription is active */
  get hasAccess(): boolean {
    if (this.authSvc.isAdmin) return true;
    return this._status.value?.hasAccess ?? false;
  }

  get trialDaysRemaining(): number { return this._status.value?.trialDaysRemaining ?? 0; }

  get subscriptionLabel(): string {
    if (this.authSvc.isAdmin) return '🛡️ Admin';
    const s = this._status.value;
    if (!s) return '';
    if (s.isTrialActive)        return `Trial (${s.trialDaysRemaining}d left)`;
    if (s.isSubscriptionActive) return 'Active';
    return 'Expired';
  }

  // ── HTTP helpers ─────────────────────────────────────────────────────────

  refreshStatus(userId: string): void {
    this.http
      .get<SubscriptionStatus>(`${this.base}/status/${userId}`,
                               { headers: this.authSvc.getAuthHeaders() })
      .pipe(catchError(() => of(null)))
      .subscribe(s => this._status.next(s));
  }

  checkAccess(userId: string): Observable<{ hasAccess: boolean }> {
    return this.http
      .get<{ hasAccess: boolean }>(`${this.base}/check-access/${userId}`,
                                   { headers: this.authSvc.getAuthHeaders() });
  }

  createOrder(userId: string): Observable<CreateOrderResponse> {
    return this.http.post<CreateOrderResponse>(
      `${this.base}/create-order`,
      { userId },
      { headers: this.authSvc.getAuthHeaders() }
    );
  }

  verifyPayment(payload: VerifyPaymentRequest): Observable<PaymentVerifiedResponse> {
    return this.http
      .post<PaymentVerifiedResponse>(
        `${this.base}/verify-payment`,
        payload,
        { headers: this.authSvc.getAuthHeaders() }
      )
      .pipe(
        tap(res => {
          if (res.success && this.authSvc.currentUser) {
            this.refreshStatus(this.authSvc.currentUser.userId);
          }
        })
      );
  }
}
