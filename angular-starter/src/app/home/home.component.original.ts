import { Component, ElementRef, HostListener, Input, OnInit, ViewChild } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  @Input() fullName = 'Jayant Bhardwaj';
  @Input() jobTitle = 'Software Engineering Manager';
  @Input() companyName = 'PWC, India';

  @ViewChild('accent', { static: true }) accent!: ElementRef<HTMLElement>;
  @ViewChild('parallaxLeft', { static: true }) parallaxLeft!: ElementRef<HTMLElement>;
  @ViewChild('parallaxRight', { static: true }) parallaxRight!: ElementRef<HTMLElement>;
  @ViewChild('cta', { static: true }) cta!: ElementRef<HTMLElement>;

  greetingMessage = '';

  get firstName(): string {
    return (this.fullName || '').trim().split(/\s+/)[0] || this.fullName;
  }

  get lastName(): string {
    const parts = (this.fullName || '').trim().split(/\s+/).filter(Boolean);
    return parts.length > 1 ? parts.slice(1).join(' ') : '';
  }

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
    el.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px)`;
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

    if (left) left.style.transform = `translateY(${scrollY * 0.12}px)`;
    if (right) right.style.transform = `translateY(${scrollY * 0.06}px)`;
  }

  private getGreeting(): string {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good Morning';
    if (hrs <= 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  scrollToSection(sectionId: string, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    
    const element = document.getElementById(sectionId);
    if (!element) return;

    const headerOffset = 80;
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
}
