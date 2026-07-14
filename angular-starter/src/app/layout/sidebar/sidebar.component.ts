import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { SidebarStateService } from '../../services/sidebar-state.service';
import { CustomAuthService } from '../../shared/custom-auth.service';

/**
 * SidebarComponent - Permanent ChatGPT-style navigation sidebar
 *
 * Always present in the layout (no *ngIf).
 * Contains:
 *   - Header: panel toggle + new-chat compose button
 *   - Body (scrollable): nav links + grouped chat history
 *   - Footer: user account row
 *
 * Collapse behaviour:
 *   Desktop: width transition 260px to 0px (fully hidden)
 *   Mobile:  position:fixed off-canvas drawer (transform translateX)
 */
@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {

  @HostBinding('class.mobile-open') isMobileOpen = false;
  collapsed = false;
  isAdmin = false;

  readonly history = [
    { id: 1, label: 'Angular signals deep dive',     group: 'today'     },
    { id: 2, label: 'TypeScript generics explained', group: 'today'     },
    { id: 3, label: 'Debounce vs throttle',          group: 'today'     },
    { id: 4, label: 'CSS Grid vs Flexbox',           group: 'yesterday' },
    { id: 5, label: 'Lazy loading in Angular',       group: 'yesterday' },
    { id: 6, label: 'RxJS switchMap vs mergeMap',    group: 'prev7'     },
    { id: 7, label: 'Binary search walkthrough',     group: 'prev7'     },
    { id: 8, label: 'Promise.all vs Promise.race',   group: 'prev7'     },
  ];

  get todayItems()     { return this.history.filter(h => h.group === 'today');     }
  get yesterdayItems() { return this.history.filter(h => h.group === 'yesterday'); }
  get prev7Items()     { return this.history.filter(h => h.group === 'prev7');     }

  private subs = new Subscription();

  constructor(
    private sidebarState: SidebarStateService,
    private auth: CustomAuthService
  ) {}

  ngOnInit(): void {
    this.subs.add(this.sidebarState.collapsed$.subscribe(v  => this.collapsed    = v));
    this.subs.add(this.sidebarState.mobileOpen$.subscribe(v => this.isMobileOpen = v));
    this.subs.add(this.auth.currentUser$.subscribe(() => this.isAdmin = this.auth.isAdmin));
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  handleToggle(): void {
    if (window.innerWidth <= 768) {
      this.sidebarState.closeMobileDrawer();
    } else {
      this.sidebarState.toggleCollapsed();
    }
  }
}
