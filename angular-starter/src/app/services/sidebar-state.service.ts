import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * SidebarStateService
 *
 * Single source of truth for sidebar state across all components.
 * Provided at root level so LayoutComponent, SidebarComponent, and
 * NavbarComponent all share the same instance without prop drilling.
 *
 * Two independent state channels:
 *  - collapsed$   → desktop: icon-only (70px) vs expanded (260px)
 *  - mobileOpen$  → mobile: off-canvas drawer open vs hidden
 */
@Injectable({ providedIn: 'root' })
export class SidebarStateService {

  // ── Desktop: collapsed (icon-only) vs expanded ──────────────────
  private _collapsed$ = new BehaviorSubject<boolean>(false);
  readonly collapsed$ = this._collapsed$.asObservable();
  get isCollapsed(): boolean { return this._collapsed$.value; }

  // ── Mobile: off-canvas drawer open/closed ───────────────────────
  private _mobileOpen$ = new BehaviorSubject<boolean>(false);
  readonly mobileOpen$ = this._mobileOpen$.asObservable();
  get isMobileOpen(): boolean { return this._mobileOpen$.value; }

  // ── Desktop controls ────────────────────────────────────────────
  toggleCollapsed(): void {
    this._collapsed$.next(!this._collapsed$.value);
  }

  setCollapsed(value: boolean): void {
    this._collapsed$.next(value);
  }

  // ── Mobile controls ─────────────────────────────────────────────
  openMobileDrawer(): void  { this._mobileOpen$.next(true);  }
  closeMobileDrawer(): void { this._mobileOpen$.next(false); }

  toggleMobileDrawer(): void {
    this._mobileOpen$.next(!this._mobileOpen$.value);
  }
}
