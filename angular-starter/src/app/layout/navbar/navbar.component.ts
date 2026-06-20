import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ThemeService } from '../../shared/theme.service';
import { CustomAuthService } from '../../shared/custom-auth.service';
import { AuthTriggerService } from '../../shared/auth-trigger.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  isDark = false;

  /** Reactive auth state — updated via BehaviorSubject so template stays in sync. */
  isLoggedIn       = false;
  userInitial      = '';
  userEmail        = '';
  showUserMenu     = false;
  isMobileMenuOpen = false;

  /** Close dropdowns when clicking anywhere outside the relevant elements. */
  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (!target.closest('.nav-user-menu')) {
      this.showUserMenu = false;
    }
    if (!target.closest('.nav-hamburger') && !target.closest('.nav-mobile-drawer')) {
      this.isMobileMenuOpen = false;
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    this.showUserMenu = false;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  private _themeSub?: Subscription;
  private _authSub?:  Subscription;

  constructor(
    public themeSvc:    ThemeService,
    private auth:       CustomAuthService,
    private authTrigger: AuthTriggerService,
    private router:     Router,
  ) {}

  ngOnInit(): void {
    this._themeSub = this.themeSvc.isDark$.subscribe(v => this.isDark = v);

    // Mirror auth state into component properties so Angular CD always picks it up
    this._authSub = this.auth.currentUser$.subscribe(user => {
      this.isLoggedIn  = !!user;
      this.userInitial = user?.username?.charAt(0)?.toUpperCase()
                      || user?.email?.charAt(0)?.toUpperCase()
                      || '';
      this.userEmail   = user?.email ?? '';
    });
  }

  ngOnDestroy(): void {
    this._themeSub?.unsubscribe();
    this._authSub?.unsubscribe();
  }

  openLogin(): void {
    this.authTrigger.requestLogin();
  }

  logout(): void {
    this.auth.logout();
  }
}
