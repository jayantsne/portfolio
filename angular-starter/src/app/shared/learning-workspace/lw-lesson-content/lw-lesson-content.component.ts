import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, OnChanges, SimpleChanges,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LwTopic, LwSection, LwMessage, SECTION_META, SectionType } from '../learning-workspace.models';

/** A rendered lesson section — content already converted to SafeHtml */
export interface RenderedSection {
  type: SectionType;
  icon: string;
  title: string;
  htmlContent: SafeHtml;
}

@Component({
  selector: 'app-lw-lesson-content',
  templateUrl: './lw-lesson-content.component.html',
  styleUrls: ['./lw-lesson-content.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LwLessonContentComponent implements OnChanges {

  // ── Inputs ──────────────────────────────────────────────────────────────

  /** The topic whose lesson is displayed */
  @Input() topic: LwTopic | null = null;

  /** Raw lesson sections (content as plain/markdown text) */
  @Input() sections: LwSection[] = [];

  /** True while the AI is loading the initial lesson */
  @Input() loading = false;

  /** True if the AI call errored */
  @Input() error = false;

  /** Follow-up messages below the lesson */
  @Input() followUpMessages: LwMessage[] = [];

  /** True while AI is generating a follow-up reply */
  @Input() followUpLoading = false;

  /** Disables nav/complete buttons when there's nothing loaded */
  @Input() hasPrev = false;
  @Input() hasNext = false;

  // ── Outputs ─────────────────────────────────────────────────────────────

  @Output() markComplete = new EventEmitter<void>();
  @Output() prevTopic    = new EventEmitter<void>();
  @Output() nextTopic    = new EventEmitter<void>();
  @Output() retry        = new EventEmitter<void>();

  // ── Internal ─────────────────────────────────────────────────────────────

  rendered: RenderedSection[] = [];

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sections']) {
      this.rendered = this.sections.map(s => {
        const m = SECTION_META[s.type] ?? { icon: '📋', title: 'Section' };
        return {
          type: s.type,
          icon: s.icon || m.icon,
          title: s.title || m.title,
          htmlContent: this.sanitizer.bypassSecurityTrustHtml(s.content),
        };
      });
    }
  }

  get isCompleted(): boolean {
    return this.topic?.status === 'completed';
  }

  get isLocked(): boolean {
    return this.topic?.status === 'locked';
  }

  get isEmpty(): boolean {
    return !this.topic && !this.loading;
  }

  trackByIndex(i: number): number { return i; }
}
