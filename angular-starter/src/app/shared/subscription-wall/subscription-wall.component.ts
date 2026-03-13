import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Reusable paywall overlay.
 * Usage: <app-subscription-wall [visible]="true" (closed)="onClose()"></app-subscription-wall>
 */
@Component({
  selector:    'app-subscription-wall',
  templateUrl: './subscription-wall.component.html',
  styleUrls:   ['./subscription-wall.component.css']
})
export class SubscriptionWallComponent {
  @Input()  visible  = false;
  @Input()  feature  = 'this feature';
  @Output() closed   = new EventEmitter<void>();

  constructor(private router: Router) {}

  subscribe(): void { this.router.navigate(['/subscribe']); }
  dismiss():   void { this.closed.emit(); }
}
