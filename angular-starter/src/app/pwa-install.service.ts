import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PwaInstallService {
  private deferredPrompt: any = null;
  private installableSubject = new BehaviorSubject<boolean>(false);
  public installable$ = this.installableSubject.asObservable();

  constructor() {
    this.initPWA();
  }

  private initPWA(): void {
    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('💾 PWA: beforeinstallprompt event fired');
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      this.deferredPrompt = e;
      // Update installable state
      this.installableSubject.next(true);
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA: App was installed');
      this.deferredPrompt = null;
      this.installableSubject.next(false);
      this.trackInstallEvent('success');
    });

    // Check if already installed
    if (this.isAppInstalled()) {
      console.log('📱 PWA: App is already installed');
      this.installableSubject.next(false);
    }
  }

  public async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.log('⚠️ PWA: Install prompt not available');
      return false;
    }

    try {
      // Show the install prompt
      this.deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const choiceResult = await this.deferredPrompt.userChoice;
      
      console.log('👤 PWA: User choice:', choiceResult.outcome);
      
      if (choiceResult.outcome === 'accepted') {
        console.log('✅ PWA: User accepted the install prompt');
        this.trackInstallEvent('accepted');
      } else {
        console.log('❌ PWA: User dismissed the install prompt');
        this.trackInstallEvent('dismissed');
      }

      // Clear the deferredPrompt
      this.deferredPrompt = null;
      this.installableSubject.next(false);
      
      return choiceResult.outcome === 'accepted';
    } catch (error) {
      console.error('❌ PWA: Error prompting install:', error);
      return false;
    }
  }

  public isAppInstalled(): boolean {
    // Check if running in standalone mode (installed)
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true ||
           document.referrer.includes('android-app://');
  }

  public isPWASupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  private trackInstallEvent(outcome: string): void {
    // Track with Google Analytics if available
    if (typeof gtag !== 'undefined') {
      gtag('event', 'pwa_install', {
        event_category: 'engagement',
        event_label: outcome,
        value: outcome === 'success' ? 1 : 0
      });
    }
  }

  public registerServiceWorker(): void {
    // DISABLED IN DEVELOPMENT - Service worker causes reload loops
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isDevServer = window.location.port && (window.location.port === '4200' || window.location.port === '4300');
    
    if (isLocalhost || isDevServer) {
      console.log('🔧 DEV: Service worker registration DISABLED (localhost/dev server)');
      return;
    }
    
    // Only register service worker in production (not localhost or ng serve)
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then((registration) => {
            console.log('✅ Service Worker registered:', registration.scope);
            setInterval(() => {
              registration.update();
            }, 60000); // Check every minute
          })
          .catch((error) => {
            console.error('❌ Service Worker registration failed:', error);
          });
      });
    }
  }
}

// Declare gtag for TypeScript
declare let gtag: Function;
