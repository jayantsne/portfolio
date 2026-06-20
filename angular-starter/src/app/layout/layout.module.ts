import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { LayoutComponent } from './layout.component';
import { NavbarComponent } from './navbar/navbar.component';

/**
 * LayoutModule
 *
 * Encapsulates the app shell components:
 *   LayoutComponent  — flex-column shell (navbar + content-wrapper)
 *   NavbarComponent  — sticky 52px top nav bar
 *
 * The old SidebarComponent is no longer part of the layout.
 * Navigation lives entirely in the navbar.
 * Contextual panel content is injected by pages via SidebarContentService.
 */
@NgModule({
  declarations: [
    LayoutComponent,
    NavbarComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
  ],
  exports: [
    LayoutComponent,
  ],
})
export class LayoutModule {}
