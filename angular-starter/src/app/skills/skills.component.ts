import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-skills',
  templateUrl: './skills.component.html',
  styleUrls: ['./skills.component.css']
})
export class SkillsComponent implements OnInit {
skills = [
    {
      name: 'ASP.NET MVC',
      percent: 90,
      icon: 'bi-code-slash',
      desc: 'Enterprise-grade web applications using MVC architecture',
      details: [
        'MVC architecture',
        'Razor views',
        'Authentication & Authorization',
        'Performance optimization'
      ]
    },
    {
      name: 'JavaScript',
      percent: 80,
      icon: 'bi-braces',
      desc: 'Modern ES6+, async programming, DOM manipulation',
      details: [
        'ES6+ syntax',
        'Async / Await',
        'Browser APIs',
        'Performance optimization'
      ]
    },
    {
      name: 'HTML & CSS',
      percent: 90,
      icon: 'bi-filetype-html',
      desc: 'Responsive layouts, animations, modern UI',
      details: [
        'Flexbox & Grid',
        'Responsive design',
        'Animations',
        'Accessibility'
      ]
    },
    {
      name: 'REST APIs',
      percent: 85,
      icon: 'bi-diagram-3',
      desc: 'Secure, scalable RESTful services',
      details: [
        'REST principles',
        'JWT authentication',
        'API versioning',
        'Error handling'
      ]
    }
  ];

activeSkill: any = null;
  constructor() { }
  openModal(skill: any): void {
    this.activeSkill = skill;
    document.body.style.overflow = 'hidden'; // lock scroll
  }

  closeModal(): void {
    this.activeSkill = null;
    document.body.style.overflow = ''; // restore scroll
  }

  ngOnInit(): void {
  }
  
ngAfterViewInit() {
 const cards = document.querySelectorAll('.skill-card');

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const card = entry.target as HTMLElement;
        const percent = Number(card.dataset['percent']);
        const progress = card.querySelector('.progress') as SVGCircleElement;
        const value = card.querySelector('.circle-value') as HTMLElement;

        const radius = 45;
        const circumference = 2 * Math.PI * radius;

        progress.style.strokeDashoffset =
          `${circumference - (percent / 100) * circumference}`;

        let count = 0;
        const timer = setInterval(() => {
          if (count >= percent) {
            clearInterval(timer);
          } else {
            count++;
            value.innerText = `${count}%`;
          }
        }, 15);

        observer.unobserve(card);
      });
    }, { threshold: 0.5 });

    cards.forEach(card => observer.observe(card));
}

}
