import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CustomAuthService }   from '../shared/custom-auth.service';
import { SubscriptionService, SubscriptionStatus, CreateOrderResponse } from '../shared/subscription.service';

// Razorpay checkout is loaded from index.html script tag
declare const Razorpay: any;

@Component({
  selector:    'app-subscribe',
  templateUrl: './subscribe.component.html',
  styleUrls:   ['./subscribe.component.css']
})
export class SubscribeComponent implements OnInit, OnDestroy {

  status:       SubscriptionStatus | null = null;
  loading       = true;
  paymentBusy   = false;
  successMsg    = '';
  errorMsg      = '';

  private sub$: Subscription | null = null;

  constructor(
    public  auth:    CustomAuthService,
    public  subSvc:  SubscriptionService,
    private router:  Router
  ) {}

  ngOnInit(): void {
    // Admins never need to pay — redirect immediately
    if (this.auth.isAdmin) {
      this.router.navigate(['/']);
      return;
    }

    this.sub$ = this.subSvc.status$.subscribe(s => {
      this.status  = s;
      this.loading = false;
      // If user already has access, redirect to home after 2 s
      if (s?.hasAccess && !this.successMsg) {
        setTimeout(() => this.router.navigate(['/']), 2200);
      }
    });

    const userId = this.auth.currentUser?.userId;
    if (userId) this.subSvc.refreshStatus(userId);
    else        this.loading = false;
  }

  ngOnDestroy(): void { this.sub$?.unsubscribe(); }

  /** Opens the Razorpay checkout modal. */
  pay(): void {
    if (!this.auth.currentUser) {
      this.errorMsg = 'Please sign in first.';
      return;
    }
    this.paymentBusy = true;
    this.errorMsg    = '';

    this.subSvc.createOrder(this.auth.currentUser.userId).subscribe({
      next:  order => this.openRazorpay(order),
      error: ()    => {
        this.paymentBusy = false;
        this.errorMsg    = 'Could not reach payment gateway. Please try again in a moment.';
      }
    });
  }

  private openRazorpay(order: CreateOrderResponse): void {
    const user = this.auth.currentUser!;

    const options = {
      key:         order.keyId,
      amount:      order.amountPaise,   // in paise
      currency:    order.currency,
      name:        'AI Learn Pro',
      description: 'Monthly Subscription – ₹199/month',
      image:       '/assets/icons/icon-192x192.png',
      order_id:    order.orderId,
      prefill: {
        name:  user.username,
        email: user.email,
      },
      theme:  { color: '#6366f1' },
      modal:  { ondismiss: () => { this.paymentBusy = false; } },
      handler: (response: any) => this.handlePaymentSuccess(response, order.orderId),
    };

    try {
      const rzp = new Razorpay(options);
      rzp.on('payment.failed', (res: any) => {
        this.paymentBusy = false;
        this.errorMsg    = `Payment failed: ${res.error?.description ?? 'Unknown error'}`;
      });
      rzp.open();
    } catch {
      this.paymentBusy = false;
      this.errorMsg    = 'Razorpay failed to load. Reload the page and try again.';
    }
  }

  private handlePaymentSuccess(response: any, orderId: string): void {
    this.subSvc.verifyPayment({
      userId:            this.auth.currentUser!.userId,
      razorpayOrderId:   orderId,
      razorpayPaymentId: response.razorpay_payment_id,
      razorpaySignature: response.razorpay_signature,
    }).subscribe({
      next: res => {
        this.paymentBusy = false;
        if (res.success) {
          this.successMsg = '🎉 Payment successful! Your AI Learn Pro subscription is now active.';
          // SubscriptionService auto-refreshes status; guard will allow through on next nav
          setTimeout(() => this.router.navigate(['/']), 2500);
        } else {
          this.errorMsg = res.message || 'Payment verification failed.';
        }
      },
      error: () => {
        this.paymentBusy = false;
        this.errorMsg    = 'Verification request failed. Contact support if amount was deducted.';
      }
    });
  }

  goHome(): void { this.router.navigate(['/']); }
}
