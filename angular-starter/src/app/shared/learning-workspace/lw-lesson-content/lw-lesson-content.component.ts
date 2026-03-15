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

  /** Accumulated text while AI is streaming (cleared once done) */
  @Input() streamingText = '';

  /** True from first chunk until stream completes */
  @Input() isStreaming = false;

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
        // If content starts with '<' it's already HTML (from formatExplanation),
        // otherwise treat as markdown and convert it.
        const isHtml = s.content.trim().startsWith('<');
        const html   = isHtml ? s.content : this.toHtml(s.content);
        return {
          type: s.type,
          icon: s.icon || m.icon,
          title: s.title || m.title,
          htmlContent: this.sanitizer.bypassSecurityTrustHtml(html),
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

  /** SafeHtml rendered from the progressive streaming text */
  get streamingHtml(): SafeHtml {
    if (!this.streamingText) return '';
    return this.sanitizer.bypassSecurityTrustHtml(this.toHtml(this.streamingText));
  }

  /** Lightweight markdown → HTML conversion used only for streaming display */
  private toHtml(text: string): string {
    // Close unclosed code fence so the partial stream renders safely
    if ((text.match(/```/g) ?? []).length % 2 !== 0) text += '\n```';

    // Code blocks first (before other substitutions)
    let html = text.replace(/```(\w*)\n?([\s\S]*?)```/g,
      (_m, _lang, code) =>
        `<pre class="md-pre"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim()}</code></pre>`
    );

    // Headings
    html = html.replace(/^###\s+(.+)$/gm, '<h3 class="ai-heading">$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm,  '<h3 class="ai-heading">$1</h3>');
    html = html.replace(/^#\s+(.+)$/gm,   '<h2 class="ai-heading">$1</h2>');

    // Bold
    html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');

    // Inline code
    html = html.replace(/`([^`\n]+)`/g, '<code class="md-inline">$1</code>');

    // Numbered & bullet lists
    html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li>$2</li>');
    html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');

    // Paragraph breaks and line breaks
    html = html.replace(/\n\n+/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    return `<p>${html}</p>`;
  }
}
