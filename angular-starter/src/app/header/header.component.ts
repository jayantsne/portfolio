import { Component, HostListener, ElementRef, ViewChild, AfterViewInit, Input } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { Router } from '@angular/router';
import { AuthService } from '../shared/auth.service';
import { ApiService } from '../shared/api.service';

declare global {
  interface Window {
    Scrollbar?: any;
  }
}

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  animations: [
    // subtle fade on initial paint
    trigger('fadeDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-12px)' }),
        animate('420ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
  ]
})
export class HeaderComponent implements AfterViewInit {
  @Input() brandText = 'My Portfolio';
  @Input() brandHref = '#';
  @Input() brandSubText = 'Portfolio';
  @Input() roleText = '';
  @Input() companyText = '';

  constructor(
    private el: ElementRef,
    public authService: AuthService,
    private router: Router,
    private apiService: ApiService
  ) { }

  get displayBrandName(): string {
    const raw = (this.brandText || '').trim();
    if (!raw) return '';
    // Keep first token only (premium/clean header)
    return raw.split(/\s+/)[0];
  }

  get metaText(): string {
    const role = (this.roleText || '').trim();
    const company = (this.companyText || '').trim();
    if (!role && !company) return '';
    if (role && company) return `// ${role} @ ${company}`;
    return `// ${role || company}`;
  }

  @ViewChild('hdr', { static: true }) hdr!: ElementRef<HTMLElement>;
  scrolled = false;
  activeSection: 'home' | 'about' | 'skills' | 'experience' | 'contact' | null = 'home';

  private lastScrollY = 0;

  private sectionObserver?: IntersectionObserver;

  private scrollRootEl?: HTMLElement;
  private scrollListener?: () => void;
  private scrollbarInstance?: any;
  private scrollbarUnsub?: () => void;
  private scrollbarBindTimer?: number;

  // Auth settings
  authSettings: any = {
    faceIdEnabled: true,
    twoFactorEnabled: true,
    voiceLoginEnabled: false,
    biometricEnabled: true,
    smsAuthEnabled: false,
    emailAuthEnabled: true
  };

  ngAfterViewInit() {
    // set header height var for spacer (prevents layout jump)
    const h = this.hdr.nativeElement.offsetHeight;
    document.documentElement.style.setProperty('--header-h', h + 'px');

    // Load auth settings
    this.loadAuthSettings();

    // Detect custom scroll container (Smooth Scrollbar) if present
    this.scrollRootEl = document.getElementById('my-scrollbar') ?? undefined;

    // Keep scrolled state + progress in sync
    this.scrollListener = () => this.updateProgress();
    window.addEventListener('scroll', this.scrollListener, { passive: true });
    if (this.scrollRootEl) {
      this.scrollRootEl.addEventListener('scroll', this.scrollListener, { passive: true });
      this.tryBindSmoothScrollbar();
      // Smooth-scrollbar scripts load after Angular; retry briefly.
      if (!this.scrollbarInstance) {
        const started = Date.now();
        this.scrollbarBindTimer = window.setInterval(() => {
          if (this.scrollbarInstance) {
            window.clearInterval(this.scrollbarBindTimer);
            this.scrollbarBindTimer = undefined;
            return;
          }
          this.tryBindSmoothScrollbar();
          if (Date.now() - started > 4000) {
            window.clearInterval(this.scrollbarBindTimer);
            this.scrollbarBindTimer = undefined;
          }
        }, 200);
      }
    }

    this.updateProgress();

    // keep nav link active state in sync with visible sections
    this.setupSectionObserver();
  }

  ngOnDestroy() {
    this.sectionObserver?.disconnect();

    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
      this.scrollRootEl?.removeEventListener('scroll', this.scrollListener);
    }
    this.scrollbarUnsub?.();
    if (this.scrollbarBindTimer) {
      window.clearInterval(this.scrollbarBindTimer);
      this.scrollbarBindTimer = undefined;
    }
  }

  private tryBindSmoothScrollbar() {
    if (!this.scrollRootEl) return;
    if (this.scrollbarInstance) return;
    const Scrollbar = window.Scrollbar;
    if (!Scrollbar?.get) return;
    const inst = Scrollbar.get(this.scrollRootEl);
    if (!inst?.addListener) return;

    this.scrollbarInstance = inst;
    const fn = () => this.updateProgress();
    inst.addListener(fn);
    this.scrollbarUnsub = () => inst.removeListener(fn);
  }

  @HostListener('window:scroll')
  onScroll() {
    this.updateProgress();
  }

  private updateProgress() {
    let y = window.scrollY || document.documentElement.scrollTop || 0;
    let max = 0;

    if (this.scrollbarInstance?.offset && this.scrollbarInstance?.limit) {
      y = this.scrollbarInstance.offset.y || 0;
      max = this.scrollbarInstance.limit.y || 0;
    } else if (this.scrollRootEl) {
      y = this.scrollRootEl.scrollTop || 0;
      max = (this.scrollRootEl.scrollHeight - this.scrollRootEl.clientHeight) || 0;
    } else {
      const doc = document.documentElement;
      max = (doc.scrollHeight - doc.clientHeight) || 0;
    }

    this.scrolled = y > 24;

    this.lastScrollY = y;

    // If we're at the very top (Home hero), mark Home active.
    if (y < 32) {
      this.activeSection = 'home';
    } else if (this.activeSection === 'home') {
      this.activeSection = null;
    }

    const denom = max || 1;
    const p = Math.min(Math.max(y / denom, 0), 1); // 0..1

    // feed CSS var to drive gradient + bar
    this.hdr.nativeElement.style.setProperty('--progress', String(p));
  }

  private setupSectionObserver() {
    const ids: Array<'home' | 'about' | 'skills' | 'experience' | 'contact'> = ['home', 'about', 'skills', 'experience', 'contact'];
    const els = ids
      .map(id => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);

    if (!els.length) {
      return;
    }

    this.sectionObserver?.disconnect();
    this.sectionObserver = new IntersectionObserver(
      entries => {
        // When we're at the very top, always keep Home active.
        // (Some layouts can make the next section intersect by a few pixels.)
        if (this.lastScrollY < 32) {
          this.activeSection = 'home';
          return;
        }

        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0));

        const top = visible[0]?.target as HTMLElement | undefined;
        const id = top?.id as typeof this.activeSection | undefined;
        // When none are visible, don't stick on the last section.
        // If we're near the top, show Home.
        this.activeSection = id ?? (this.lastScrollY < 32 ? 'home' : null);
      },
      {
        root: this.scrollRootEl ?? null,
        threshold: [0.2, 0.35, 0.5, 0.65],
        // account for fixed header
        rootMargin: '-20% 0px -60% 0px'
      }
    );

    els.forEach(el => this.sectionObserver!.observe(el));
  }

  /**
   * Navigate to login page
   */
  login(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Load authentication settings from database
   */
  loadAuthSettings(): void {
    const userId = this.authService.getUserId();
    this.apiService.getAuthSettings(userId).subscribe(
      (settings) => {
        if (settings && Object.keys(settings).length > 0) {
          this.authSettings = settings;
          console.log('✅ Header: Loaded auth settings from database:', this.authSettings);
        } else {
          // Use defaults if empty object
          this.setDefaultAuthSettings();
          console.log('📝 Header: Using default auth settings (empty object from API)');
        }
      },
      (error) => {
        console.error('❌ Header: Error loading auth settings:', error);
        this.setDefaultAuthSettings();
        console.log('📝 Header: Using default auth settings (API error)');
      }
    );
  }

  setDefaultAuthSettings(): void {
    this.authSettings = {
      faceIdEnabled: true,
      twoFactorEnabled: true,
      voiceLoginEnabled: false,
      biometricEnabled: true,
      smsAuthEnabled: false,
      emailAuthEnabled: true
    };
  }

  /**
   * Open Face ID setup modal
   */
  openFaceIDSetup(): void {
    if (!this.authSettings.faceIdEnabled) {
      alert('⚠️ Face ID is currently disabled by the administrator. Please contact support to enable this feature.');
      return;
    }
    alert('Face ID Setup: This feature allows you to use facial recognition for authentication. You would need to enroll your face first, then you can login using your camera. This is a demo feature.');
  }

  /**
   * Open 2FA setup modal
   */
  open2FASetup(): void {
    if (!this.authSettings.twoFactorEnabled) {
      alert('⚠️ Two-Factor Authentication is currently disabled by the administrator. Please contact support to enable this feature.');
      return;
    }
    alert('2FA Setup: Two-Factor Authentication adds an extra layer of security. Scan a QR code with your authenticator app and enter the 6-digit code. This is a demo feature. Demo code: 123456');
  }

  /**
   * Open voice assistant
   */
  openVoiceAssistant(): void {
    if (!this.authSettings.voiceLoginEnabled) {
      alert('⚠️ Voice Login is currently disabled or not available. Please contact support for more information.');
      return;
    }
    alert('Voice Login: Coming soon! This feature will allow you to authenticate using your voice biometrics.');
  }

  /**
   * Logout user
   */
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  /**
   * Check if current route is admin page
   */
  isAdminRoute(): boolean {
    return this.router.url.includes('/admin') || this.router.url.includes('/questions');
  }
}
