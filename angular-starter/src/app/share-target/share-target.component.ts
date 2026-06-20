import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ShareDraftService } from '../shared/share-draft.service';

/**
 * Handles incoming Web Share Target requests.
 *
 * The PWA manifest routes  GET /share?text=...&title=...&url=...  here.
 * This component appends the shared text to the persistent draft and
 * immediately redirects to /notes so the user can review and save.
 */
@Component({
  selector: 'app-share-target',
  template: `
    <div class="st-splash">
      <div class="st-card">
        <div class="st-icon">📝</div>
        <p class="st-msg">{{ message }}</p>
        <p class="st-sub" *ngIf="count > 0">{{ count }} block{{ count !== 1 ? 's' : '' }} in draft</p>
      </div>
    </div>
  `,
  styles: [`
    .st-splash {
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f4f6fb;
    }
    .st-card {
      text-align: center;
      background: #fff;
      border-radius: 18px;
      padding: 40px 32px;
      box-shadow: 0 8px 32px rgba(99,102,241,.12);
      max-width: 320px;
      width: 90%;
    }
    .st-icon { font-size: 40px; margin-bottom: 12px; }
    .st-msg  { color: #1a1d2e; font-weight: 600; font-size: 15px; margin: 0 0 6px; }
    .st-sub  { color: #64748b; font-size: 13px; margin: 0; }
  `]
})
export class ShareTargetComponent implements OnInit {
  message = 'Saving to draft…';
  count   = 0;

  constructor(
    private route:  ActivatedRoute,
    private router: Router,
    private draft:  ShareDraftService
  ) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const text   = params.get('text')  || '';
    const title  = params.get('title') || '';
    const url    = params.get('url')   || '';

    // Build the inbound text — combine title + text + url if present
    const parts: string[] = [];
    if (title.trim()) parts.push(title.trim());
    if (text.trim())  parts.push(text.trim());
    if (url.trim() && url !== text) parts.push(url.trim());

    const incoming = parts.join('\n\n');

    if (incoming.trim()) {
      this.draft.appendLines(incoming);
      this.message = '✅ Added to draft!';
    } else {
      this.message = 'Nothing to save.';
    }

    this.count = this.draft.lineCount();

    // Redirect to notes after a short visual confirmation
    setTimeout(() => {
      this.router.navigate(['/notes'], { queryParams: { openDraft: '1' } });
    }, 900);
  }
}
