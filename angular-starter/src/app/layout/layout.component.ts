import { Component, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Observable } from 'rxjs';
import { TemplateRef } from '@angular/core';
import { SidebarContentService } from './sidebar-content.service';
import { Router } from '@angular/router';
import { CustomAuthService } from '../shared/custom-auth.service';
import { ThemeService } from '../shared/theme.service';
import { AuthTriggerService } from '../shared/auth-trigger.service';

/**
 * LayoutComponent — App Shell
 *
 * Flex-column shell: sticky navbar + scrollable content-wrapper.
 *
 *   .layout (flex-column)
 *     └── app-navbar          (sticky, 52px)
 *     └── .content-wrapper    (flex-row, flex:1)
 *           └── .panel        (300px, contextual — only shown when a page registers panel content)
 *           └── .main         (flex:1, primary scroll zone)
 *                 └── router-outlet
 *
 * Pages that need a panel register an ng-template via SidebarContentService.
 * Pages without a panel get a clean full-width main area.
 */
@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnDestroy, AfterViewInit {

  readonly hasPanel$:    Observable<boolean>;
  readonly panelTitle$:  Observable<string>;
  readonly panelTpl$:    Observable<TemplateRef<any> | null>;

  isScrolled = false;
  @ViewChild('mainRef', { static: false }) mainRef!: ElementRef<HTMLElement>;
  private readonly _onScroll = () => {
    this.isScrolled = (this.mainRef?.nativeElement?.scrollTop ?? 0) > 10;
  };

  constructor(private panelContent: SidebarContentService, private router: Router, public auth: CustomAuthService, public theme: ThemeService, private authTrigger: AuthTriggerService) {
    this.hasPanel$   = panelContent.hasContent$;
    this.panelTitle$ = panelContent.title$;
    this.panelTpl$   = panelContent.template$;
  }

  ngAfterViewInit(): void {
    this.mainRef?.nativeElement?.addEventListener('scroll', this._onScroll, { passive: true });
  }

  ngOnDestroy(): void {
    this.mainRef?.nativeElement?.removeEventListener('scroll', this._onScroll);
  }

  openAccount(): void {
    if (this.auth.isLoggedIn) {
      this.router.navigate(['/account']);
      return;
    }
    this.authTrigger.requestLogin();
  }
  logout(): void { this.auth.logout(); this.router.navigate(['/explore']); }
}
