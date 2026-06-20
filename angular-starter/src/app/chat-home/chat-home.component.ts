import { Component } from '@angular/core';
import { Router } from '@angular/router';

/**
 * ChatHomeComponent — ChatGPT-style landing page
 *
 * Renders at the root route ''.
 * Clean, centered UI: logo → heading → textarea input → suggestion chips.
 * No heavy backgrounds or dark themes — pure white like ChatGPT.
 */
@Component({
  selector: 'app-chat-home',
  templateUrl: './chat-home.component.html',
  styleUrls: ['./chat-home.component.css']
})
export class ChatHomeComponent {

  inputValue = '';

  /** Quick-action suggestion chips */
  readonly suggestions: { icon: string; label: string; sublabel: string; route: string }[] = [
    { icon: '💬', label: 'Interview Prep',   sublabel: 'Practice with AI',       route: '/interview-prep' },
    { icon: '📝', label: 'My Notes',         sublabel: 'Saved learning notes',   route: '/notes'          },
    { icon: '⌨️', label: 'Code Playground',  sublabel: 'Run & test code',         route: '/playground'     },
    { icon: '🗺️', label: 'Learning Roadmap', sublabel: 'Personalised plan',      route: '/roadmap'        },
  ];

  constructor(private router: Router) {}

  navigate(route: string): void {
    this.router.navigate([route]);
  }

  onSend(): void {
    if (this.inputValue.trim()) {
      // Navigate to explore with query pre-filled
      this.router.navigate(['/explore'], {
        queryParams: { q: this.inputValue.trim() }
      });
    }
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }
}
