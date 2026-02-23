import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';

@Component({
  selector: 'app-headersecond',
  templateUrl: './headersecond.component.html',
  styleUrls: ['./headersecond.component.css']
})
export class HeadersecondComponent implements OnInit {

  @ViewChild('accent', { static: true }) accent!: ElementRef<HTMLElement>;
  @ViewChild('parallaxLeft', { static: true }) parallaxLeft!: ElementRef<HTMLElement>;
  @ViewChild('parallaxRight', { static: true }) parallaxRight!: ElementRef<HTMLElement>;
  @ViewChild('cta', { static: true }) cta!: ElementRef<HTMLElement>;

 
  constructor() { }

  public greetingMessage = "";

  ngOnInit(): void {
    this.greetingMessage = this.getGreeting();
  }

  onHeroMove(event: MouseEvent) {
    const el = this.accent?.nativeElement;
    if (!el) return;
    el.style.left = event.clientX + 'px';
    el.style.top = event.clientY + 'px';
    el.style.opacity = '1';
  }

  onHeroLeave() {
    const el = this.accent?.nativeElement;
    if (!el) return;
    el.style.opacity = '0';
  }

  onCtaMove(event: MouseEvent) {
    const el = this.cta?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    el.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
  }

  onCtaLeave() {
    const el = this.cta?.nativeElement;
    if (!el) return;
    el.style.transform = 'translate(0,0)';
  }

  @HostListener('window:scroll')
  onScroll() {
    const scrollY = window.scrollY || 0;
    const left = this.parallaxLeft?.nativeElement;
    const right = this.parallaxRight?.nativeElement;

    if (left) {
      left.style.transform = `translateY(${scrollY * 0.15}px)`;
    }
    if (right) {
      right.style.transform = `translateY(${scrollY * 0.08}px)`;
    }
  }

  getGreeting(): any{
    var myDate = new Date();
    var hrs = myDate.getHours();

    var greet;

    if (hrs < 12)
        greet = 'Good Morning';
    else if (hrs >= 12 && hrs <= 17)
        greet = 'Good Afternoon';
    else if (hrs >= 17 && hrs <= 24)
        greet = 'Good Evening';

        return greet;
  }

}
