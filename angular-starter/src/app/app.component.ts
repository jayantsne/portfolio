import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AnalyticsService } from './shared/analytics.service';
import { PwaInstallService } from './pwa-install.service';
import { APP_CONFIG } from './config/app.config';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
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

  constructor(
    private analyticsService: AnalyticsService,
    private pwaInstallService: PwaInstallService,
    private router: Router
  ) {
    // No longer need to track route changes for header visibility
  }

  ngOnInit(): void {
    // Initialize Google Analytics
    this.analyticsService.init();
    
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

