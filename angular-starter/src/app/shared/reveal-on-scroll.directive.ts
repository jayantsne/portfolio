import { Directive, ElementRef, OnDestroy, OnInit, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appRevealOnScroll]'
})
export class RevealOnScrollDirective implements OnInit, OnDestroy {
  private scrollbarUnsub?: () => void;
  private winScrollListener?: () => void;
  private rootScrollListener?: () => void;
  private resizeListener?: () => void;
  private bindTimer?: number;

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    const el = this.elementRef.nativeElement;

    // Ensure base class exists so CSS can animate.
    this.renderer.addClass(el, 'snap-fade');

    const scrollRoot = document.getElementById('my-scrollbar') || undefined;

    const checkVisible = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const entersViewport = rect.top < vh * 0.85 && rect.bottom > vh * 0.10;
      if (entersViewport) {
        this.renderer.addClass(el, 'is-visible');
        this.cleanup();
      }
    };

    // Fallback listeners (work even if Smooth Scrollbar isn't ready yet)
    this.winScrollListener = () => checkVisible();
    window.addEventListener('scroll', this.winScrollListener, { passive: true });

    if (scrollRoot) {
      this.rootScrollListener = () => checkVisible();
      scrollRoot.addEventListener('scroll', this.rootScrollListener, { passive: true });
    }

    this.resizeListener = () => checkVisible();
    window.addEventListener('resize', this.resizeListener, { passive: true });

    // Smooth Scrollbar listener (best signal when window scroll stays at 0)
    const tryBind = () => {
      if (!scrollRoot) return false;
      const Scrollbar = (window as any).Scrollbar;
      const inst = Scrollbar?.get ? Scrollbar.get(scrollRoot) : undefined;
      if (!inst?.addListener) return false;

      const fn = () => checkVisible();
      inst.addListener(fn);
      this.scrollbarUnsub = () => inst.removeListener(fn);
      return true;
    };

    if (!tryBind() && scrollRoot) {
      const started = Date.now();
      this.bindTimer = window.setInterval(() => {
        if (tryBind()) {
          window.clearInterval(this.bindTimer);
          this.bindTimer = undefined;
          return;
        }
        if (Date.now() - started > 4000) {
          window.clearInterval(this.bindTimer);
          this.bindTimer = undefined;
        }
      }, 200);
    }

    // Initial check in case it's already visible
    checkVisible();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private cleanup(): void {
    this.scrollbarUnsub?.();
    if (this.winScrollListener) {
      window.removeEventListener('scroll', this.winScrollListener);
      this.winScrollListener = undefined;
    }
    const scrollRoot = document.getElementById('my-scrollbar') || undefined;
    if (scrollRoot && this.rootScrollListener) {
      scrollRoot.removeEventListener('scroll', this.rootScrollListener);
      this.rootScrollListener = undefined;
    }
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      this.resizeListener = undefined;
    }

    if (this.bindTimer) {
      window.clearInterval(this.bindTimer);
      this.bindTimer = undefined;
    }
  }
}
