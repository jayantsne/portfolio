import { Injectable, OnDestroy } from '@angular/core';
import { environment } from '../../environments/environment';

/**
 * DevToolsGuardService
 * ─────────────────────────────────────────────────────────────────────────
 * Layers of protection (all production-only):
 *
 *   1. Blocks right-click context menu
 *   2. Blocks keyboard shortcuts: F12, Ctrl+U, Ctrl+Shift+I/J/C/K/E
 *   3. Detects DevTools open via window-size delta (Chrome/Edge/Firefox)
 *      → Injects a full-screen blocking overlay when DevTools is detected
 *   4. Logs a scam-deterrent console warning (Facebook-style)
 *
 * Caveats (browser limitation — cannot be worked around):
 *   • The browser always has the code — this raises the bar, not a hard wall.
 *   • DevTools detection has ~5% false-positive rate (docked panels, zoom, etc.)
 *   • CDP / extensions can bypass keyboard blocking.
 *
 * Real security already in place in this project:
 *   ✅ OpenAI key stored as server env var only — never shipped to the client
 *   ✅ All AI calls proxied through the authenticated /api/ai/stream endpoint
 *   ✅ Production build: optimization+minification, sourceMap:false, hash-all
 *   ✅ Post-build JS obfuscation via `npm run build:secure`
 *
 * Only active when environment.production === true.
 * ─────────────────────────────────────────────────────────────────────────
 */
@Injectable({ providedIn: 'root' })
export class DevToolsGuardService implements OnDestroy {

  private boundContextmenu!: (e: MouseEvent) => void;
  private boundKeydown!:     (e: KeyboardEvent) => void;
  private devtoolsTimer:     ReturnType<typeof setInterval> | null = null;
  private overlay:           HTMLElement | null = null;

  // Threshold: DevTools panel open vertically (≥200px) or horizontally (≥200px)
  private readonly DEVTOOLS_THRESHOLD = 200;

  /** Call once from AppComponent.ngOnInit() */
  init(): void {
    if (!environment.production) return; // dev stays fully open for debugging

    this.blockContextMenu();
    this.blockInspectShortcuts();
    this.watchDevTools();
    this.warnInConsole();
  }

  // ── 1. Right-click ──────────────────────────────────────────────────────

  private blockContextMenu(): void {
    this.boundContextmenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', this.boundContextmenu);
  }

  // ── 2. Keyboard shortcuts ────────────────────────────────────────────────

  private blockInspectShortcuts(): void {
    this.boundKeydown = (e: KeyboardEvent) => {
      const ctrl  = e.ctrlKey || e.metaKey;  // Ctrl (Win/Linux) or Cmd (Mac)
      const shift = e.shiftKey;
      const key   = e.key;

      const blocked =
        key === 'F12'                          // DevTools toggle
        || (ctrl && (key === 'u' || key === 'U'))  // View Source
        || (ctrl && shift && key === 'I')      // DevTools  (Chrome/Edge)
        || (ctrl && shift && key === 'J')      // Console   (Chrome/Edge)
        || (ctrl && shift && key === 'C')      // Inspector (Chrome/Edge)
        || (ctrl && shift && key === 'K')      // Console   (Firefox)
        || (ctrl && shift && key === 'E');     // Network   (Firefox)

      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('keydown', this.boundKeydown, { capture: true });
  }

  // ── 3. DevTools open detection ───────────────────────────────────────────
  // Polls every 1 second. When the window chrome grows by ≥200 px (DevTools
  // panel steals viewport space) we show a blocking overlay.

  private watchDevTools(): void {
    this.devtoolsTimer = setInterval(() => {
      const widthDelta  = window.outerWidth  - window.innerWidth;
      const heightDelta = window.outerHeight - window.innerHeight;
      const isOpen = widthDelta > this.DEVTOOLS_THRESHOLD
                  || heightDelta > this.DEVTOOLS_THRESHOLD;

      if (isOpen) {
        this.showOverlay();
      } else {
        this.hideOverlay();
      }
    }, 1000);
  }

  private showOverlay(): void {
    if (this.overlay) return; // already visible

    const el = document.createElement('div');
    el.id = '__dt-guard';
    Object.assign(el.style, {
      position:        'fixed',
      inset:           '0',
      zIndex:          '2147483647',
      background:      '#0f172a',
      display:         'flex',
      flexDirection:   'column',
      alignItems:      'center',
      justifyContent:  'center',
      gap:             '16px',
      fontFamily:      'system-ui, sans-serif',
      color:           '#f8fafc',
      userSelect:      'none',
    });

    el.innerHTML = `
      <div style="font-size:3rem">🔒</div>
      <h1 style="font-size:1.6rem;font-weight:700;margin:0;color:#f8fafc">
        Developer Tools Detected
      </h1>
      <p style="font-size:1rem;color:#94a3b8;max-width:400px;text-align:center;margin:0;line-height:1.6">
        Please close Developer Tools to continue using AI Learn.
      </p>
    `;

    document.body.appendChild(el);
    this.overlay = el;
  }

  private hideOverlay(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  // ── 4. Console warning ───────────────────────────────────────────────────

  private warnInConsole(): void {
    const boldRed = [
      'color:#ef4444', 'font-size:20px', 'font-weight:bold',
      'background:#1e293b', 'padding:8px 16px', 'border-radius:6px',
    ].join(';');

    console.log('%c⛔ Stop!', boldRed);
    console.log(
      '%cThis browser feature is intended for developers.\n' +
      'If someone told you to paste something here, it is likely a scam.',
      'color:#f97316;font-size:14px;'
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
    if (this.devtoolsTimer !== null) {
      clearInterval(this.devtoolsTimer);
      this.devtoolsTimer = null;
    }
    this.hideOverlay();
  }
}
