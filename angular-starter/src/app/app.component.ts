import { AfterViewInit, Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd, NavigationStart, NavigationCancel, NavigationError } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AnalyticsService } from './shared/analytics.service';
import { APP_CONFIG } from './config/app.config';
import { DevToolsGuardService } from './shared/devtools-guard.service';
import { ThemeService } from './shared/theme.service';
import { AuthTriggerService } from './shared/auth-trigger.service';
import { AuthModalComponent } from './auth-modal/auth-modal.component';
import { GlobalLoaderService } from './shared/global-loader/global-loader.service';
import { AndroidBackButtonService } from './shared/android-back-button.service';
import { NativeRecallNotificationService } from './shared/native-recall-notification.service';
import { PlatformService } from './shared/platform.service';

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
  showSplash = APP_CONFIG.splashScreen.enabled;
  splashDuration = APP_CONFIG.splashScreen.minDurationMs;
  showPortfolioHeader = true;
  isHomePage = false;

  get title(): string { return this.fullName; }

  constructor(
    private analyticsService: AnalyticsService,
    private router: Router,
    private route: ActivatedRoute,
    private devToolsGuard: DevToolsGuardService,
    private authTrigger: AuthTriggerService,
    private ngZone: NgZone,
    private globalLoader: GlobalLoaderService,
    private androidBackButton: AndroidBackButtonService,
    private nativeRecallNotifications: NativeRecallNotificationService,
    private platform: PlatformService,
    readonly themeSvc: ThemeService
  ) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) this.globalLoader.begin();
      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) this.globalLoader.end();
    });
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe((event: any) => {
      const url = (event as NavigationEnd).urlAfterRedirects || event.url;
      this.isHomePage = url === '/' || url === '/explore' || url === '/home' || url.startsWith('/home?');
      if (url.includes('login=required')) {
        setTimeout(() => this.ngZone.run(() => this.authModal?.open('login')), 300);
      }
    });
  }

  ngAfterViewInit(): void {
    this.authTrigger.login$.subscribe(() => this.ngZone.run(() => this.authModal?.open('login')));
  }

  onGlobalLoggedIn(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl) this.router.navigateByUrl(returnUrl);
  }

  ngOnInit(): void {
    document.documentElement.classList.toggle('capacitor-native', this.platform.isNative());
    document.documentElement.classList.toggle('capacitor-android', this.platform.isAndroid());
    this.androidBackButton.init();
    void this.nativeRecallNotifications.init();
    this.analyticsService.init();
    this.devToolsGuard.init();
  }

  onSplashDone(): void { this.showSplash = false; }
}
