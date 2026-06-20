import { Injectable, TemplateRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * SidebarContentService
 *
 * Decouples page components from the SidebarComponent by acting as a
 * message bus for contextual sidebar content.
 *
 * Page components register an ng-template that the sidebar then renders
 * via *ngTemplateOutlet. This gives full control over sidebar content
 * (lists, filters, history, etc.) to each page component without
 * requiring any inheritance or direct component coupling.
 *
 * ─── How to use in a page component ─────────────────────────────────
 *
 *   // 1. Declare a template in your component HTML:
 *   //    <ng-template #sidebarTpl> ... your sidebar content ... </ng-template>
 *
 *   // 2. In the component TS:
 *   @ViewChild('sidebarTpl', { read: TemplateRef }) sidebarTpl!: TemplateRef<any>;
 *
 *   constructor(private sidebarContent: SidebarContentService) {}
 *
 *   ngAfterViewInit() {
 *     this.sidebarContent.set(this.sidebarTpl, 'Questions');
 *   }
 *
 *   ngOnDestroy() {
 *     this.sidebarContent.clear();
 *   }
 *
 * ─────────────────────────────────────────────────────────────────────
 */
@Injectable({ providedIn: 'root' })
export class SidebarContentService {

  private _template$ = new BehaviorSubject<TemplateRef<any> | null>(null);
  private _title$    = new BehaviorSubject<string>('');

  /**
   * The TemplateRef registered by the active page component.
   * Null when no page has registered content.
   */
  readonly template$ = this._template$.asObservable();

  /**
   * Section heading shown in the sidebar header panel.
   * Empty string when not set.
   */
  readonly title$ = this._title$.asObservable();

  /**
   * True while any page has registered sidebar content.
   * The LayoutComponent uses this to conditionally render <app-sidebar>.
   */
  readonly hasContent$ = this._template$.pipe(map(t => t !== null));

  /**
   * Register contextual sidebar content.
   * Call this from ngAfterViewInit() once the @ViewChild TemplateRef is resolved.
   *
   * @param tpl   The TemplateRef, resolved via @ViewChild('sidebarTpl')
   * @param title Optional heading displayed in the sidebar panel header
   */
  set(tpl: TemplateRef<any>, title = ''): void {
    this._template$.next(tpl);
    this._title$.next(title);
  }

  /**
   * Remove the registered content and hide the sidebar.
   * Always call this from ngOnDestroy() to prevent stale content
   * appearing when the user navigates to a page with no sidebar.
   */
  clear(): void {
    this._template$.next(null);
    this._title$.next('');
  }
}
