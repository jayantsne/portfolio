import { Component } from '@angular/core';

@Component({
  selector: 'app-test-page',
  template: `
    <div style="padding: 2rem; text-align: center;">
      <h1>✅ Test Page Loaded Successfully</h1>
      <p>If you see this page without reloading, the issue is with another component.</p>
      <p>Current time: {{ currentTime }}</p>
      <button (click)="updateTime()" style="padding: 1rem; margin-top: 1rem; background: #4a90e2; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Update Time
      </button>
    </div>
  `,
  styles: []
})
export class TestPageComponent {
  currentTime = new Date().toLocaleTimeString();

  updateTime() {
    this.currentTime = new Date().toLocaleTimeString();
  }
}
