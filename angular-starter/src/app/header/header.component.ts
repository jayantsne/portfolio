import { Component, HostListener, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  animations: [
    // subtle fade on initial paint
    trigger('fadeDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-12px)' }),
        animate('420ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
  ]
})
export class HeaderComponent implements AfterViewInit {
  @ViewChild('hdr', { static: true }) hdr!: ElementRef<HTMLElement>;
  scrolled = false;

  ngAfterViewInit() {
    // set header height var for spacer (prevents layout jump)
    const h = this.hdr.nativeElement.offsetHeight;
    document.documentElement.style.setProperty('--header-h', h + 'px');
    this.updateProgress();
  }

  @HostListener('window:scroll')
  onScroll() {
    this.updateProgress();
  }

  private updateProgress() {
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    this.scrolled = y > 24;

    const doc = document.documentElement;
    const max = (doc.scrollHeight - doc.clientHeight) || 1;
    const p = Math.min(Math.max(y / max, 0), 1); // 0..1

    // feed CSS var to drive gradient + bar
    this.hdr.nativeElement.style.setProperty('--progress', String(p));
  }
}
