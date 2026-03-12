import { Injectable, OnDestroy } from '@angular/core';
import { environment } from '../../environments/environment';

/**
 * DevToolsGuardService
 * ─────────────────────────────────────────────────────────────────────────
 * What this DOES:
 *   • Disables right-click context menu
 *   • Blocks common inspection keyboard shortcuts (F12, Ctrl+U, Ctrl+Shift+I/J/C)
 *   • Logs a console warning to discourage casual snooping
 *
 * What this DOES NOT do (and cannot do):
 *   • Truly prevent source-code inspection — the browser always has the code.
 *   • Protect real secrets — your OpenAI key lives on the .NET server, not here.
 *   • Stop browser extensions or CDP-based tooling.
 *
 * Real security already in place in this project:
 *   ✅ OpenAI key is on the .NET server only (env var / appsettings)
 *   ✅ All AI calls go through the authenticated /api/ai/stream backend
 *   ✅ Production build: optimization: true, sourceMap: false, buildOptimizer: true
 *   ✅ Output hashing on all assets (cache-busting + no predictable filenames)
 *
 * Only active in production builds.
 * ─────────────────────────────────────────────────────────────────────────
 */
@Injectable({ providedIn: 'root' })
export class DevToolsGuardService implements OnDestroy {

  private boundContextmenu!: (e: MouseEvent) => void;
  private boundKeydown!: (e: KeyboardEvent) => void;

  /** Call once from AppComponent.ngOnInit() */
  init(): void {
    if (!environment.production) return; // dev mode: keep tools open for debugging

    this.blockContextMenu();
    this.blockInspectShortcuts();
    this.warnInConsole();
  }

  // ── Right-click ─────────────────────────────────────────────────────────

  private blockContextMenu(): void {
    this.boundContextmenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', this.boundContextmenu);
  }

  // ── Keyboard shortcuts ───────────────────────────────────────────────────

  private blockInspectShortcuts(): void {
    this.boundKeydown = (e: KeyboardEvent) => {
      const ctrl  = e.ctrlKey  || e.metaKey;   // Ctrl on Win/Linux, Cmd on Mac
      const shift = e.shiftKey;
      const key   = e.key;

      const blocked =
        key === 'F12'                           // DevTools toggle
        || (ctrl && key === 'u')                // View Source
        || (ctrl && shift && key === 'I')       // DevTools (Chrome)
        || (ctrl && shift && key === 'J')       // Console (Chrome)
        || (ctrl && shift && key === 'C')       // Inspector (Chrome)
        || (ctrl && shift && key === 'K')       // Console (Firefox)
        || (ctrl && shift && key === 'E');      // Network (Firefox)

      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('keydown', this.boundKeydown, { capture: true });
  }

  // ── Console warning ──────────────────────────────────────────────────────

  private warnInConsole(): void {
    const style = [
      'color: #ef4444',
      'font-size: 20px',
      'font-weight: bold',
      'background: #1e293b',
      'padding: 8px 16px',
      'border-radius: 6px',
    ].join(';');

    console.log('%c⛔ Stop!', style);
    console.log(
      '%cThis browser feature is intended for developers. ' +
      'If someone told you to paste something here, it may be a scam.',
      'color: #f97316; font-size: 14px;'
    );
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────

  ngOnDestroy(): void {
    if (this.boundContextmenu) {
      document.removeEventListener('contextmenu', this.boundContextmenu);
    }
    if (this.boundKeydown) {
      document.removeEventListener('keydown', this.boundKeydown, { capture: true } as EventListenerOptions);
    }
  }
}
