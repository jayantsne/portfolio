import { Component, OnInit } from '@angular/core';
import { AnalyticsService } from './shared/analytics.service';
import { PwaInstallService } from './pwa-install.service';

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

  showSplash = true;
  showInstallPrompt = false;
  isAppInstalled = false;

  constructor(
    private analyticsService: AnalyticsService,
    private pwaInstallService: PwaInstallService
  ) {}

  ngOnInit(): void {
    // Initialize Google Analytics
    this.analyticsService.init();
    
    // Initialize PWA
    this.pwaInstallService.registerServiceWorker();
    
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

