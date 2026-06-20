import { Injectable } from '@angular/core';

export interface ShareDraft {
  lines: string[];
  addedAt: number;
}

const DRAFT_KEY = 'lwa_share_draft';

@Injectable({ providedIn: 'root' })
export class ShareDraftService {

  /** Return the current draft, or null if none. */
  getDraft(): ShareDraft | null {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /** Append one or more text segments, deduplicating exact matches. */
  appendLines(incoming: string): void {
    const draft = this.getDraft() ?? { lines: [], addedAt: Date.now() };
    const normalized = incoming.trim();
    if (!normalized) return;

    // Split large pastes on double-newlines into logical blocks
    const blocks = normalized
      .split(/\n{2,}/)
      .map(b => b.trim())
      .filter(b => b.length > 0);

    for (const block of blocks) {
      if (!draft.lines.includes(block)) {
        draft.lines.push(block);
      }
    }
    draft.addedAt = Date.now();
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }

  /** Merge draft lines into a single formatted string ready for the note editor. */
  buildContent(): string {
    const draft = this.getDraft();
    if (!draft || draft.lines.length === 0) return '';
    return draft.lines.join('\n\n');
  }

  /** Clear the draft after saving or cancelling. */
  clearDraft(): void {
    localStorage.removeItem(DRAFT_KEY);
  }

  hasDraft(): boolean {
    const d = this.getDraft();
    return !!(d && d.lines.length > 0);
  }

  lineCount(): number {
    return this.getDraft()?.lines.length ?? 0;
  }
}
