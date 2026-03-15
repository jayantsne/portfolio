import { Directive, HostListener } from '@angular/core';
import { PlaygroundService } from '../services/playground.service';

/**
 * Apply this directive to any element that renders markdown via [innerHTML].
 * It delegates click events bubbled from .md-try-btn buttons injected by MarkdownPipe.
 *
 * Usage:  <div class="md-content" [innerHTML]="text | markdown" appTryNow></div>
 */
@Directive({ selector: '[appTryNow]' })
export class TryNowDirective {

  constructor(private pg: PlaygroundService) {}

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const btn = target.closest('.md-try-btn') as HTMLElement | null;
    if (!btn) return;

    event.preventDefault();
    event.stopPropagation();

    const code = decodeURIComponent(btn.dataset['code'] ?? '');
    const lang = btn.dataset['lang'] ?? 'javascript';

    if (!code.trim()) return;

    this.pg.openWith(code, lang);
  }
}
