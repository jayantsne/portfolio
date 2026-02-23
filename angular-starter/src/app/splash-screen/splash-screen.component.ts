import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-splash-screen',
  templateUrl: './splash-screen.component.html',
  styleUrls: ['./splash-screen.component.css']
})
export class SplashScreenComponent implements OnInit, OnDestroy {
  @Output() done = new EventEmitter<void>();

  // How long splash stays on screen before fading out.
  @Input() minDurationMs = 3200;

  leaving = false;

  private hideTimer?: number;
  private doneTimer?: number;

  ngOnInit(): void {
    // Keep it snappy: show briefly, then fade out.
    this.hideTimer = window.setTimeout(() => {
      this.leaving = true;
      this.doneTimer = window.setTimeout(() => this.done.emit(), 420);
    }, Math.max(0, this.minDurationMs));
  }

  ngOnDestroy(): void {
    if (this.hideTimer) window.clearTimeout(this.hideTimer);
    if (this.doneTimer) window.clearTimeout(this.doneTimer);
  }

  skip() {
    if (this.leaving) return;
    this.leaving = true;
    this.doneTimer = window.setTimeout(() => this.done.emit(), 220);
  }
}
