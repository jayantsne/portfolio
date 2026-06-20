import { AfterViewInit, Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AnalyticsService } from './shared/analytics.service';
import { PwaInstallService } from './pwa-install.service';
import { APP_CONFIG } from './config/app.config';
import { DevToolsGuardService } from './shared/devtools-guard.service';
import { ThemeService } from './shared/theme.service';
import { AuthTriggerService } from './shared/auth-trigger.service';
import { AuthModalComponent } from './auth-modal/auth-modal.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild('globalAuthModal') authModal!: AuthModalComponent;
  fullName = 'Jayant Bhardwaj';
  jobTitle = 'Software Engineering Manager';
  companyName = 'PwC, India';

  // used by the navbar brand
  get title() {
    return this.fullName;
  }

  showSplash = APP_CONFIG.splashScreen.enabled; // Controlled by config (default: disabled)
  splashDuration = APP_CONFIG.splashScreen.minDurationMs;
  showInstallPrompt = false;
  isAppInstalled = false;
  showPortfolioHeader = true; // Always show header, but conditionally hide portfolio sections
  isHomePage = false;

  constructor(
    private analyticsService: AnalyticsService,
    private pwaInstallService: PwaInstallService,
    private router: Router,
    private route: ActivatedRoute,
    private devToolsGuard: DevToolsGuardService,
    private authTrigger: AuthTriggerService,
    private ngZone: NgZone,
    readonly themeSvc: ThemeService  // Inject early so theme is guaranteed applied at app start
  ) {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        const url: string = (e as NavigationEnd).urlAfterRedirects || e.url;
        this.isHomePage = url === '/' || url === '/explore' || url === '/home' || url.startsWith('/home?');
        // LoginGuard redirects here with ?login=required — open the modal automatically
        if (url.includes('login=required')) {
          setTimeout(() => this.ngZone.run(() => this.authModal?.open('login')), 300);
        }
      });
  }

  ngAfterViewInit(): void {
    // Subscribe to the auth trigger bus — any component can call
    // authTrigger.requestLogin() and this will open the global modal.
    this.authTrigger.login$.subscribe(() => {
      this.ngZone.run(() => this.authModal?.open('login'));
    });
  }

  /** Called when the auth modal reports a successful login / signup. */
  onGlobalLoggedIn(): void {
    // If a guard redirected here with returnUrl, navigate back to it.
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl) {
      this.router.navigateByUrl(returnUrl);
    }
  }

  ngOnInit(): void {
    // Initialize Google Analytics
    this.analyticsService.init();

    // Block right-click + inspect shortcuts in production
    this.devToolsGuard.init();
    
    // DISABLED: Service worker registration to prevent reload loops in development
    // Only enable in production builds
    // this.pwaInstallService.registerServiceWorker();
    
    // Check if app can be installed
    this.pwaInstallService.installable$.subscribe(installable => {
      this.showInstallPrompt = installable;
    });
    
    // Check if app is already installed
    this.isAppInstalled = this.pwaInstallService.isAppInstalled();
    
    // Show install prompt after a delay if not installed
    if (!this.isAppInstalled && this.pwaInstallService.isPWASupported()) {
      setTimeout(() => {
        if (this.showInstallPrompt) {
          this.showInstallBanner();
        }
      }, 5000); // Show after 5 seconds
    }
  }

  onSplashDone() {
    this.showSplash = false;
  }
  
  showInstallBanner() {
    // This will be shown in the template
    console.log('📱 PWA: Install banner can be shown');
  }
  
  async installPWA() {
    const installed = await this.pwaInstallService.promptInstall();
    if (installed) {
      this.showInstallPrompt = false;
      this.isAppInstalled = true;
    }
  }
  
  dismissInstallPrompt() {
    this.showInstallPrompt = false;
    // Remember dismissal for 7 days
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  }
}

