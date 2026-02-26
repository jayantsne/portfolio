import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';

interface Particle {
  x: number;
  y: number;
  delay: number;
  dur: number;
  size: number;
}

@Component({
  selector: 'app-splash-screen',
  templateUrl: './splash-screen.component.html',
  styleUrls: ['./splash-screen.component.css']
})
export class SplashScreenComponent implements OnInit, OnDestroy {
  @Output() done = new EventEmitter<void>();
  @Input() minDurationMs = 3800;

  leaving = false;
  particles: Particle[] = [];
  pct = 0;

  private hideTimer?: number;
  private doneTimer?: number;
  private pctTimer?: number;

  ngOnInit(): void {
    // Generate random particles
    this.particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 4,
      dur: 3 + Math.random() * 4,
      size: 1 + Math.random() * 2.5
    }));

    // Drive progress percentage counter
    const step = 100 / (this.minDurationMs / 80);
    this.pctTimer = window.setInterval(() => {
      this.pct = Math.min(100, Math.round(this.pct + step));
      if (this.pct >= 100) window.clearInterval(this.pctTimer);
    }, 80);

    this.hideTimer = window.setTimeout(() => {
      this.leaving = true;
      this.doneTimer = window.setTimeout(() => this.done.emit(), 600);
    }, Math.max(0, this.minDurationMs));
  }

  ngOnDestroy(): void {
    if (this.hideTimer) window.clearTimeout(this.hideTimer);
    if (this.doneTimer) window.clearTimeout(this.doneTimer);
    if (this.pctTimer) window.clearInterval(this.pctTimer);
  }

  skip(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.doneTimer = window.setTimeout(() => this.done.emit(), 300);
  }
}
