import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomAuthService } from '../shared/custom-auth.service';

@Component({
  selector: 'app-auth-callback',
  template: `
    <main class="auth-callback">
      <section class="auth-callback__panel">
        <div class="auth-callback__mark"></div>
        <h1>{{ title }}</h1>
        <p>{{ message }}</p>
      </section>
    </main>
  `,
  styles: [`
    .auth-callback {
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #f6f8fc;
      color: #111827;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .auth-callback__panel {
      width: min(440px, calc(100vw - 32px));
      padding: 32px;
      border: 1px solid #dbe3f0;
      border-radius: 12px;
      background: #fff;
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
      text-align: center;
    }

    .auth-callback__mark {
      width: 44px;
      height: 44px;
      margin: 0 auto 18px;
      border-radius: 50%;
      background: linear-gradient(135deg, #14b8a6, #6366f1);
    }

    h1 {
      margin: 0 0 8px;
      font-size: 1.35rem;
      line-height: 1.2;
    }

    p {
      margin: 0;
      color: #64748b;
      line-height: 1.6;
    }
  `]
})
export class AuthCallbackComponent implements OnInit {
  title = 'Completing sign in';
  message = 'Checking your secure session...';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: CustomAuthService
  ) {}

  ngOnInit(): void {
    const success = this.route.snapshot.queryParamMap.get('success') === '1';
    const error = this.route.snapshot.queryParamMap.get('error');
    const returnUrl = this.safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));

    if (!success) {
      this.title = 'Sign in failed';
      this.message = error || 'Google sign in could not be completed.';
      setTimeout(() => this.router.navigate(['/'], { queryParams: { login: 'required' } }), 1200);
      return;
    }

    this.auth.refreshSession().subscribe({
      next: () => this.router.navigateByUrl(returnUrl),
      error: () => {
        this.title = 'Session not found';
        this.message = 'Please try signing in again.';
        setTimeout(() => this.router.navigate(['/'], { queryParams: { login: 'required' } }), 1200);
      }
    });
  }

  private safeReturnUrl(value: string | null): string {
    if (!value || !value.startsWith('/') || value.startsWith('//')) {
      return '/explore';
    }

    return value;
  }
}
