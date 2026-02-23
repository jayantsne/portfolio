import {
  Component,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  QueryList,
  ViewChildren
} from '@angular/core';

@Component({
  selector: 'app-experience',
  templateUrl: './experience.component.html',
  styleUrls: ['./experience.component.css']
})
export class ExperienceComponent implements AfterViewInit, OnDestroy {

  @ViewChildren('cards', { read: ElementRef })
  cards!: QueryList<ElementRef>;

  activeIndex = -1; // ✅ FIX: active index state

  private observer!: IntersectionObserver;
  private scrollListener!: () => void;
  private scrollRoot?: HTMLElement;
  private scrollbarInstance?: any;
  private scrollbarUnsub?: () => void;
  private scrollbarBindTimer?: number;

  /* ===============================
     EXPERIENCE DATA
  ================================ */
  experiences = [
    {
      role: 'Software Engineering Manager',
      company: 'PwC',
      location: 'India',
      duration: '2025 – Present',
      logo: 'pwc.svg',
      description:
        'Building enterprise-grade web applications using .NET technologies with a strong focus on scalability, performance, and modern UI.',
      tech: ['.NET MVC', 'REST APIs', 'SQL Server', 'Angular'],
      responsibilities: [
        'Designed and implemented scalable MVC-based architectures',
        'Developed secure and high-performance REST APIs',
        'Optimized SQL queries and database performance',
        'Collaborated with UI teams to deliver modern, responsive interfaces'
      ],
      expanded: false
    },
    {
      role: 'Senior Developer I',
      company: 'Ticketmaster',
      location: 'India',
      duration: '2024 – 2025',
      logo: 'ticketmaster.svg',
      description:
        'Worked on large-scale enterprise applications with a focus on backend services, performance optimization, and UI improvements.',
      tech: ['C#', 'SQL Server', 'JavaScript', 'HTML & CSS'],
      responsibilities: [
        'Enhanced backend services for reliability and scalability',
        'Improved database performance through query optimization',
        'Implemented UI enhancements for internal tools',
        'Worked closely with cross-functional teams'
      ],
      expanded: false
    },
    {
      role: 'Application Development – Senior Analyst',
      company: 'Accenture',
      location: 'India',
      duration: '2021 – 2024',
      logo: 'accenture.svg',
      description:
        'Delivered enterprise solutions for global clients, contributing to both backend development and UI modernization.',
      tech: ['C#', '.NET', 'SQL Server', 'JavaScript', 'HTML & CSS'],
      responsibilities: [
        'Developed and maintained enterprise-grade applications',
        'Worked on backend logic and data access layers',
        'Enhanced UI components for better user experience',
        'Followed Agile methodologies and best coding practices'
      ],
      expanded: false
    },
    {
      role: 'Sr. Software Developer',
      company: 'Q3 Technologies',
      location: 'India',
      duration: '2019 – 2021',
      logo: 'q3.svg',
      description:
        'Worked on full-stack development projects focusing on backend systems and responsive web interfaces.',
      tech: ['C#', '.NET MVC', 'SQL Server', 'JavaScript'],
      responsibilities: [
        'Built and maintained MVC-based web applications',
        'Designed reusable components and modules',
        'Optimized backend logic for performance',
        'Mentored junior developers'
      ],
      expanded: false
    },
    {
      role: 'Software Developer',
      company: 'DotSquares Technologies',
      location: 'India',
      duration: '2017 – 2019',
      logo: 'dotsquares.svg',
      description:
        'Contributed to multiple client projects by developing robust backend services and dynamic web interfaces.',
      tech: ['C#', '.NET', 'SQL Server', 'JavaScript', 'HTML & CSS'],
      responsibilities: [
        'Developed backend modules and APIs',
        'Worked on frontend UI enhancements',
        'Collaborated with QA teams for bug fixing',
        'Maintained project documentation'
      ],
      expanded: false
    },
    {
      role: 'Software Developer',
      company: 'Anand Rathi IT Pvt Ltd',
      location: 'India',
      duration: '2015 – 2017',
      logo: 'anandrathi.svg',
      description:
        'Started professional career working on internal enterprise applications and financial systems.',
      tech: ['C#', '.NET', 'SQL Server', 'JavaScript'],
      responsibilities: [
        'Developed internal business applications',
        'Worked on database design and maintenance',
        'Implemented UI features as per business requirements',
        'Provided production support and bug fixes'
      ],
      expanded: false
    }
  ];

  /* ===============================
     LIFECYCLE
  ================================ */
  ngAfterViewInit(): void {
    this.scrollRoot = document.getElementById('my-scrollbar') ?? undefined;
    this.initIntersectionObserver();
    this.initScrollProgress();
    this.updateActiveIndexFromViewport();
  }

  ngOnDestroy(): void {
    if (this.observer) this.observer.disconnect();
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
      this.scrollRoot?.removeEventListener('scroll', this.scrollListener);
    }

    this.scrollbarUnsub?.();
    if (this.scrollbarBindTimer) {
      window.clearInterval(this.scrollbarBindTimer);
      this.scrollbarBindTimer = undefined;
    }
  }

  /* ===============================
     INTERSECTION OBSERVER
     (ACTIVE INDEX)
  ================================ */
  private initIntersectionObserver(): void {
    this.observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const index = this.cards
              .toArray()
              .findIndex(c => c.nativeElement === entry.target);

            if (index !== -1) {
              // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
              setTimeout(() => {
                this.activeIndex = index;
              }, 0);
            }
          }
        });
      },
      {
        root: this.scrollRoot ?? null,
        threshold: 0.6
      }
    );

    this.cards.forEach(card =>
      this.observer.observe(card.nativeElement)
    );
  }

  /* ===============================
     SCROLL PROGRESS LINE
  ================================ */
  private initScrollProgress(): void {
    const section = document.getElementById('experience');
    const progressLine = document.querySelector('.timeline-progress') as HTMLElement;

    if (!section || !progressLine) return;

    this.scrollListener = () => {
      const rect = section.getBoundingClientRect();
      const windowHeight = this.scrollRoot?.clientHeight ?? window.innerHeight;

      const visible = Math.min(
        Math.max(windowHeight - rect.top, 0),
        rect.height
      );

      progressLine.style.height = `${(visible / rect.height) * 100}%`;
      this.updateActiveIndexFromViewport();
    };

    window.addEventListener('scroll', this.scrollListener, { passive: true });
    this.scrollRoot?.addEventListener('scroll', this.scrollListener, { passive: true });
    this.scrollListener();

    this.tryBindSmoothScrollbar();
    if (!this.scrollbarInstance && this.scrollRoot) {
      const started = Date.now();
      this.scrollbarBindTimer = window.setInterval(() => {
        if (this.scrollbarInstance) {
          window.clearInterval(this.scrollbarBindTimer);
          this.scrollbarBindTimer = undefined;
          return;
        }
        this.tryBindSmoothScrollbar();
        if (Date.now() - started > 4000) {
          window.clearInterval(this.scrollbarBindTimer);
          this.scrollbarBindTimer = undefined;
        }
      }, 200);
    }
  }

  private updateActiveIndexFromViewport() {
    if (!this.cards?.length) return;

    const viewportHeight = this.scrollRoot?.clientHeight ?? window.innerHeight;
    const focusY = viewportHeight * 0.35;

    let bestIdx = this.activeIndex;
    let bestDist = Number.POSITIVE_INFINITY;

    this.cards.forEach((el, idx) => {
      const rect = el.nativeElement.getBoundingClientRect();
      const dist = Math.abs(rect.top - focusY);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
      }
    });

    this.activeIndex = bestIdx;
  }

  private tryBindSmoothScrollbar() {
    if (!this.scrollRoot) return;
    if (this.scrollbarInstance) return;
    const Scrollbar = (window as any).Scrollbar;
    if (!Scrollbar?.get) return;
    const inst = Scrollbar.get(this.scrollRoot);
    if (!inst?.addListener) return;

    this.scrollbarInstance = inst;
    const fn = () => this.scrollListener?.();
    inst.addListener(fn);
    this.scrollbarUnsub = () => inst.removeListener(fn);
  }

  /* ===============================
     EXPAND / COLLAPSE
  ================================ */
  toggleResponsibilities(exp: any): void {
    exp.expanded = !exp.expanded;
  }
}
